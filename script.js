const AppState = {
  token: localStorage.getItem('gitup_token') || '',
  user: null,
  repos: [],
  history: JSON.parse(localStorage.getItem('gitup_history') || '[]')
};

window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    splash.style.opacity = '0';
    setTimeout(() => splash.style.display = 'none', 500);
  }, 3000);
});

function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  const index = ['home', 'upload', 'history', 'login'].indexOf(pageId);
  if (index !== -1) {
    document.querySelectorAll('.nav-item')[index].classList.add('active');
  }
}

function setUploadMode(mode) {
  const isFile = mode === 'file';
  document.getElementById('tabBtnUpload').classList.toggle('active', isFile);
  document.getElementById('tabBtnCreate').classList.toggle('active', !isFile);
  document.getElementById('formUploadFile').style.display = isFile ? 'block' : 'none';
  document.getElementById('formCreateRepo').style.display = isFile ? 'none' : 'block';
}

function writeMonitor(message, type = 'info') {
  const box = document.getElementById('liveMonitor');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = document.createElement('div');
  line.className = `monitor-line ${type}`;
  line.innerHTML = `[${time}] ${message}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function handleMultipleFileNotice() {
  const files = document.getElementById('uploadFileInput').files;
  const countEl = document.getElementById('fileSelectedCount');
  countEl.innerText = files.length > 0 ? `${files.length} berkas dipilih.` : '';
}

function handleFolderSelectNotice() {
  const files = document.getElementById('newRepoFolderInput').files;
  const countEl = document.getElementById('folderSelectedCount');
  countEl.innerText = files.length > 0 ? `Folder terdeteksi: ${files.length} berkas di dalamnya.` : '';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function addHistory(action, title, link) {
  AppState.history.unshift({
    id: Date.now(),
    action,
    title,
    link,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  localStorage.setItem('gitup_history', JSON.stringify(AppState.history));
  renderHistory();
}

function deleteHistoryItem(id) {
  AppState.history = AppState.history.filter(h => h.id !== id);
  localStorage.setItem('gitup_history', JSON.stringify(AppState.history));
  renderHistory();
}

function clearAllHistory() {
  AppState.history = [];
  localStorage.removeItem('gitup_history');
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyListContainer');
  if (AppState.history.length === 0) {
    container.innerHTML = '<li style="font-size:0.82rem; color:var(--text-muted);">Belum ada riwayat aktivitas.</li>';
    return;
  }
  container.innerHTML = AppState.history.map(item => `
    <li class="repo-item">
      <div class="repo-item-content">
        <span class="badge ${item.action === 'CREATE_REPO' ? 'badge-public' : 'badge-private'}">${item.action}</span>
        <span style="margin-left: 6px; font-weight: 500; font-size: 0.85rem;">${item.title}</span>
        <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px;">(${item.time})</span>
      </div>
      <div class="repo-actions">
        ${item.link ? `<a href="${item.link}" target="_blank" style="font-size: 0.78rem;">Buka ↗</a>` : ''}
        <button class="btn btn-danger btn-small" onclick="deleteHistoryItem(${item.id})">Hapus</button>
      </div>
    </li>
  `).join('');
}

async function handleLogin(directToken) {
  const token = directToken || document.getElementById('loginTokenInput').value.trim();
  if (!token) {
    writeMonitor('Validasi token gagal: input kosong.', 'error');
    alert('Token tidak boleh kosong.');
    return;
  }

  writeMonitor('Memverifikasi token...');

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (res.ok) {
      AppState.token = token;
      AppState.user = data;
      localStorage.setItem('gitup_token', token);

      document.getElementById('headerStatusDot').classList.add('active');
      document.getElementById('headerUsername').innerText = `@${data.login}`;

      document.getElementById('loginFormArea').style.display = 'none';
      document.getElementById('loggedProfileArea').style.display = 'block';
      document.getElementById('profAvatar').src = data.avatar_url;
      document.getElementById('profName').innerText = data.name || data.login;
      document.getElementById('profLogin').innerText = `@${data.login}`;
      document.getElementById('profBio').innerText = data.bio || 'Tidak ada keterangan bio.';

      document.getElementById('statFollowers').innerText = data.followers;
      document.getElementById('statFollowing').innerText = data.following;
      document.getElementById('statRepos').innerText = data.public_repos + (data.total_private_repos || 0);

      writeMonitor(`Terhubung sebagai @${data.login}`, 'success');
      loadRepos();
    } else {
      writeMonitor(`Verifikasi gagal: ${data.message}`, 'error');
      alert(`Gagal: ${data.message}`);
    }
  } catch (e) {
    writeMonitor('Koneksi ke GitHub API gagal.', 'error');
  }
}

function handleLogout() {
  AppState.token = '';
  AppState.user = null;
  AppState.repos = [];
  localStorage.removeItem('gitup_token');

  document.getElementById('headerStatusDot').classList.remove('active');
  document.getElementById('headerUsername').innerText = 'Tamu';
  document.getElementById('loginFormArea').style.display = 'block';
  document.getElementById('loggedProfileArea').style.display = 'none';
  document.getElementById('loginTokenInput').value = '';
  document.getElementById('uploadRepoSelect').innerHTML = '<option value="">-- Pilih repositori akun Anda --</option>';
  document.getElementById('userRepoListContainer').innerHTML = '<li style="font-size:0.82rem; color:var(--text-muted);">Silakan login untuk memuat repositori.</li>';
  writeMonitor('Sesi akun diakhiri.', 'info');
}

async function loadRepos() {
  if (!AppState.token) return;
  writeMonitor('Memuat daftar repositori...');
  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { Authorization: `Bearer ${AppState.token}` }
    });
    const repos = await res.json();
    if (res.ok && Array.isArray(repos)) {
      AppState.repos = repos;
      const select = document.getElementById('uploadRepoSelect');
      select.innerHTML = '<option value="">-- Pilih repositori akun Anda --</option>';
      repos.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.innerText = `${r.name} ${r.private ? '(Private)' : '(Public)'}`;
        select.appendChild(opt);
      });
      renderRepoList(repos);
      writeMonitor(`Ditemukan ${repos.length} repositori.`, 'success');
    }
  } catch (e) {
    writeMonitor('Gagal memuat daftar repositori.', 'error');
  }
}

document.getElementById('uploadRepoSelect').addEventListener('change', function() {
  if (this.value) document.getElementById('uploadRepoManual').value = this.value;
});

function renderRepoList(repos) {
  const list = document.getElementById('userRepoListContainer');
  if (repos.length === 0) {
    list.innerHTML = '<li style="font-size:0.82rem; color:var(--text-muted);">Tidak ada repositori.</li>';
    return;
  }
  list.innerHTML = repos.map(r => `
    <li class="repo-item">
      <div class="repo-item-content">
        <h4>
          ${r.name}
          <span class="badge ${r.private ? 'badge-private' : 'badge-public'}">${r.private ? 'Private' : 'Public'}</span>
        </h4>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${r.description || 'Tanpa deskripsi'}</div>
      </div>
      <div class="repo-actions">
        <a href="${r.html_url}" target="_blank" style="font-size:0.78rem;">Buka ↗</a>
        <button class="btn btn-danger btn-small" onclick="hapusRepo('${r.owner.login}', '${r.name}')">Hapus</button>
      </div>
    </li>
  `).join('');
}

async function hapusRepo(owner, repoName) {
  if (!confirm(`Konfirmasi: Hapus permanen repositori "${repoName}"?`)) return;
  writeMonitor(`Menghapus ${owner}/${repoName}...`);
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${AppState.token}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (res.status === 204) {
      writeMonitor(`Repositori "${repoName}" berhasil dihapus.`, 'success');
      addHistory('DELETE_REPO', repoName, '');
      loadRepos();
    } else {
      writeMonitor(`Gagal menghapus repositori. Pastikan token memiliki scope 'delete_repo'.`, 'error');
    }
  } catch (e) {
    writeMonitor('Terjadi masalah jaringan saat menghapus repositori.', 'error');
  }
}

async function putSingleFile(owner, repo, targetPath, base64Content, commitMessage) {
  let sha = null;
  try {
    const check = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`, {
      headers: { Authorization: `Bearer ${AppState.token}` }
    });
    if (check.ok) {
      const fileData = await check.json();
      sha = fileData.sha;
    }
  } catch(e) {}

  const payload = { message: commitMessage, content: base64Content };
  if (sha) payload.sha = sha;

  return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${AppState.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function buatRepoBaru() {
  if (!AppState.token) {
    writeMonitor('Akses ditolak: silakan login terlebih dahulu.', 'error');
    alert('Silakan login di tab Login!');
    return;
  }

  const name = document.getElementById('newRepoName').value.trim();
  const description = document.getElementById('newRepoDesc').value.trim();
  const isPrivate = document.getElementById('newRepoPrivate').value === 'true';
  const folderFiles = document.getElementById('newRepoFolderInput').files;

  if (!name) {
    writeMonitor('Nama repositori wajib diisi.', 'error');
    return;
  }

  writeMonitor(`Membuat repositori "${name}"...`);

  try {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AppState.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true })
    });

    const data = await res.json();
    if (res.status === 201) {
      writeMonitor(`Repositori "${data.name}" berhasil dibuat.`, 'success');
      addHistory('CREATE_REPO', data.name, data.html_url);

      if (folderFiles && folderFiles.length > 0) {
        writeMonitor(`Memulai upload folder ke "${data.name}" (${folderFiles.length} berkas)...`);
        const owner = AppState.user.login;

        for (let i = 0; i < folderFiles.length; i++) {
          const f = folderFiles[i];
          const relativePath = f.webkitRelativePath || f.name;
          writeMonitor(`[${i + 1}/${folderFiles.length}] Mengunggah: ${relativePath}...`);
          const b64 = await fileToBase64(f);
          await putSingleFile(owner, data.name, relativePath, b64, `Upload ${relativePath}`);
        }
        writeMonitor('Seluruh berkas folder berhasil diunggah.', 'success');
      }

      loadRepos();
      document.getElementById('newRepoName').value = '';
      document.getElementById('newRepoDesc').value = '';
      document.getElementById('newRepoFolderInput').value = '';
      document.getElementById('folderSelectedCount').innerText = '';
    } else {
      writeMonitor(`Gagal membuat repo: ${data.message}`, 'error');
    }
  } catch (e) {
    writeMonitor('Gangguan saat menghubungi API GitHub.', 'error');
  }
}

async function prosesUploadFile() {
  if (!AppState.token) {
    writeMonitor('Akses ditolak: silakan login terlebih dahulu.', 'error');
    alert('Silakan login di tab Login!');
    return;
  }

  const repo = document.getElementById('uploadRepoManual').value.trim();
  const prefix = document.getElementById('uploadPrefix').value.trim();
  const commitMsg = document.getElementById('uploadCommit').value.trim() || 'Upload berkas via GITUP';
  const files = document.getElementById('uploadFileInput').files;

  if (!repo || !files || files.length === 0) {
    writeMonitor('Validasi gagal: pilih repositori dan setidaknya 1 berkas.', 'error');
    return;
  }

  const owner = AppState.user ? AppState.user.login : '';
  writeMonitor(`Memulai pengunggahan ${files.length} berkas ke "${repo}"...`);

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let targetPath = file.name;
    if (prefix) {
      targetPath = `${prefix.replace(/\/+$/, '')}/${file.name}`;
    }

    writeMonitor(`[${i + 1}/${files.length}] Memproses ${file.name}...`);
    try {
      const base64 = await fileToBase64(file);
      const res = await putSingleFile(owner, repo, targetPath, base64, commitMsg);
      const resData = await res.json();

      if (res.status === 200 || res.status === 201) {
        successCount++;
        writeMonitor(`[${i + 1}/${files.length}] Berhasil: ${targetPath}`, 'success');
        addHistory('UPLOAD_FILE', `${repo}/${targetPath}`, resData.content ? resData.content.html_url : '');
      } else {
        writeMonitor(`[${i + 1}/${files.length}] Gagal: ${resData.message}`, 'error');
      }
    } catch (err) {
      writeMonitor(`[${i + 1}/${files.length}] Gagal memproses berkas: ${file.name}`, 'error');
    }
  }

  writeMonitor(`Selesai! Berhasil mengunggah ${successCount} dari ${files.length} berkas.`, 'success');
  document.getElementById('uploadFileInput').value = '';
  document.getElementById('fileSelectedCount').innerText = '';
}

window.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  if (AppState.token) {
    handleLogin(AppState.token);
  }
});