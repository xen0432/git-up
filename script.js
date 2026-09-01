let GITHUB_TOKEN = localStorage.getItem('github_oauth_token') || '';
let GITHUB_USER = null;

lucide.createIcons();

window.addEventListener('load', function() {
    setTimeout(function() {
        document.getElementById('splash-screen').classList.add('hidden');
        setTimeout(function() {
            document.getElementById('splash-screen').style.display = 'none';
            checkSession();
        }, 600);
    }, 800);
});

function loginWithToken() {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();

    if (!token || !token.startsWith('ghp_')) {
        showToast('Token harus dimulai dengan ghp_', 'error');
        return;
    }

    GITHUB_TOKEN = token;
    localStorage.setItem('github_oauth_token', token);
    loadProfile();
    showPage('home');
    showToast('Login berhasil!', 'success');
}

function checkSession() {
    const savedToken = localStorage.getItem('github_oauth_token');
    if (savedToken) {
        GITHUB_TOKEN = savedToken;
        loadProfile();
    } else {
        setStatus(false);
    }
}

async function loadProfile() {
    if (!GITHUB_TOKEN) {
        setStatus(false);
        return false;
    }

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': 'token ' + GITHUB_TOKEN,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            GITHUB_USER = await response.json();
            updateProfileDisplay();
            await loadRepos();
            setStatus(true);
            return true;
        } else {
            localStorage.removeItem('github_oauth_token');
            GITHUB_TOKEN = '';
            setStatus(false);
            return false;
        }
    } catch (error) {
        setStatus(false);
        return false;
    }
}

function setStatus(isOnline) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const loginBox = document.getElementById('login-form-box');
    const profileBox = document.getElementById('profile-display-box');
    const navLogin = document.querySelector('.nav-item[data-id="login"]');

    if (isOnline) {
        dot.className = 'w-2 h-2 rounded-full bg-green-500';
        text.textContent = 'ONLINE';
        text.className = 'text-green-400';
        if (loginBox) loginBox.style.display = 'none';
        if (profileBox) profileBox.style.display = 'block';
        if (navLogin) {
            navLogin.innerHTML = '<i data-lucide="user" class="w-5 h-5"></i>';
        }
    } else {
        dot.className = 'w-2 h-2 rounded-full bg-red-500';
        text.textContent = 'OFFLINE';
        text.className = 'text-red-400';
        if (loginBox) loginBox.style.display = 'block';
        if (profileBox) profileBox.style.display = 'none';
        if (navLogin) {
            navLogin.innerHTML = '<i data-lucide="log-in" class="w-5 h-5"></i>';
        }
    }
    lucide.createIcons();
}

function updateProfileDisplay() {
    document.getElementById('user-avatar').src = GITHUB_USER.avatar_url;
    document.getElementById('user-name').textContent = GITHUB_USER.name || GITHUB_USER.login;
    document.getElementById('user-login').textContent = '@' + GITHUB_USER.login;
    document.getElementById('stat-followers').textContent = GITHUB_USER.followers;
    document.getElementById('stat-following').textContent = GITHUB_USER.following;
}

function logoutAction() {
    localStorage.removeItem('github_oauth_token');
    GITHUB_TOKEN = '';
    GITHUB_USER = null;
    setStatus(false);
    document.getElementById('user-avatar').src = '';
    document.getElementById('user-name').textContent = '';
    document.getElementById('user-login').textContent = '';
    document.getElementById('stat-repo').textContent = '0';
    document.getElementById('stat-followers').textContent = '0';
    document.getElementById('stat-following').textContent = '0';
    addLog('Logout berhasil, sesi diakhiri');
    showToast('Berhasil logout!', 'success');
    showPage('home');
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    let icon = 'info';
    let iconColor = 'text-blue-400';
    let bgColor = 'border-blue-500/30';

    if (type === 'success') {
        icon = 'check-circle';
        iconColor = 'text-green-400';
        bgColor = 'border-green-500/30';
    } else if (type === 'error') {
        icon = 'alert-circle';
        iconColor = 'text-red-400';
        bgColor = 'border-red-500/30';
    }

    toast.className = 'bg-[#0f172a]/80 backdrop-blur-md p-3.5 rounded-2xl flex items-center gap-3 border ' + bgColor + ' shadow-xl pointer-events-auto transition-all duration-300';
    toast.innerHTML = '<i data-lucide="' + icon + '" class="w-5 h-5 ' + iconColor + ' flex-shrink-0"></i><span class="text-sm font-semibold text-white">' + message + '</span>';

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(function() {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, 3000);
}

function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-modal-msg');
    const cancelBtn = document.getElementById('confirm-btn-cancel');
    const okBtn = document.getElementById('confirm-btn-ok');

    msgEl.textContent = message;
    modal.style.display = 'flex';

    function closeModal() {
        modal.style.display = 'none';
    }

    function handleConfirm() {
        closeModal();
        onConfirm();
    }

    function handleCancel() {
        closeModal();
    }

    okBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/50', '-translate-y-1');
        if (item.dataset.id === pageId) {
            item.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/50', '-translate-y-1');
        }
    });

    window.scrollTo(0, 0);
}

function switchUploadTab(tab) {
    const fileBtn = document.getElementById('tab-file');
    const repoBtn = document.getElementById('tab-repo');
    const formFile = document.getElementById('form-file');
    const formRepo = document.getElementById('form-repo');

    fileBtn.classList.remove('active', 'text-blue-500', 'border-b-2', 'border-blue-500', 'bg-blue-500/10');
    repoBtn.classList.remove('active', 'text-blue-500', 'border-b-2', 'border-blue-500', 'bg-blue-500/10');
    formFile.classList.add('hidden');
    formRepo.classList.add('hidden');

    if (tab === 'file') {
        fileBtn.classList.add('active', 'text-blue-500', 'border-b-2', 'border-blue-500', 'bg-blue-500/10');
        formFile.classList.remove('hidden');
    } else {
        repoBtn.classList.add('active', 'text-blue-500', 'border-b-2', 'border-blue-500', 'bg-blue-500/10');
        formRepo.classList.remove('hidden');
    }
}

function termLog(message, type) {
    const terminal = document.getElementById('terminal-body');
    const line = document.createElement('div');
    const time = new Date().toLocaleTimeString();

    let prefix = '[INFO]';
    let color = 'text-slate-300';

    if (type === 'success') {
        prefix = '[SUCCESS]';
        color = 'text-green-400';
    } else if (type === 'error') {
        prefix = '[ERROR]';
        color = 'text-red-400';
    } else if (type === 'exec') {
        prefix = '[EXEC]';
        color = 'text-yellow-400';
    }

    line.className = color;
    line.textContent = prefix + ' ' + time + ' ' + message;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    const terminal = document.getElementById('terminal-body');
    terminal.innerHTML = '<div class="text-slate-500">[SISTEM] Terminal siap. Menunggu aktivitas...</div>';
}

async function loadRepos() {
    if (!GITHUB_TOKEN) return;

    try {
        const response = await fetch('https://api.github.com/user/repos?per_page=100', {
            headers: {
                'Authorization': 'token ' + GITHUB_TOKEN,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        const repos = await response.json();
        const repoList = document.getElementById('repo-list');
        const repoSelect = document.getElementById('repo-select');

        repoList.innerHTML = '';
        repoSelect.innerHTML = '';

        repos.forEach(function(repo) {
            const div = document.createElement('div');
            div.className = 'p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors border-b border-slate-800/50';
            div.innerHTML = '<div class="flex items-center gap-3 min-w-0"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg><div class="min-w-0"><p class="text-sm font-bold text-white truncate">' + repo.name + '</p><p class="text-xs text-slate-400 truncate">' + (repo.description || 'Tidak ada deskripsi') + '</p></div></div><div class="flex items-center gap-2 flex-shrink-0"><span class="text-[10px] px-2 py-1 rounded-full ' + (repo.private ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/30') + '">' + (repo.private ? 'Privat' : 'Publik') + '</span><button onclick="deleteRepoAction(\'' + repo.full_name + '\', \'' + repo.name + '\')" class="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>';
            repoList.appendChild(div);

            const option = document.createElement('option');
            option.value = repo.name;
            option.textContent = repo.name;
            repoSelect.appendChild(option);
        });

        document.getElementById('stat-repo').textContent = repos.length;
        lucide.createIcons();

    } catch (error) {
        termLog('Gagal memuat repositori: ' + error.message, 'error');
    }
}

async function createRepoAction() {
    if (!GITHUB_TOKEN || !GITHUB_USER) {
        showToast('Silakan login terlebih dahulu!', 'error');
        showPage('login');
        return;
    }

    const nameInput = document.getElementById('new-repo-name');
    const descInput = document.getElementById('new-repo-desc');
    const visRadios = document.querySelectorAll('input[name="repo-vis"]');
    const readmeCheck = document.getElementById('new-repo-readme');
    const fileInput = document.getElementById('new-repo-initial-file');
    const commitInput = document.getElementById('new-repo-commit-msg');
    const btn = document.getElementById('btn-create-repo');
    const btnText = document.getElementById('btn-create-text');

    let repoName = nameInput.value.trim().replace(/\s+/g, '-');
    if (!repoName) {
        showToast('Nama repositori tidak boleh kosong!', 'error');
        nameInput.focus();
        return;
    }

    let isPrivate = false;
    visRadios.forEach(function(r) {
        if (r.checked) isPrivate = r.value === 'private';
    });

    const withReadme = readmeCheck.checked;

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btnText.textContent = 'Membuat...';

    termLog('Membuat repositori: ' + repoName + ' (' + (isPrivate ? 'Privat' : 'Publik') + ')', 'exec');

    try {
        const repoData = {
            name: repoName,
            description: descInput.value.trim(),
            private: isPrivate,
            auto_init: withReadme
        };

        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': 'token ' + GITHUB_TOKEN,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(repoData)
        });

        const result = await response.json();

        if (!response.ok) {
            let errorMsg = 'Gagal membuat repositori';
            if (result.errors && result.errors.length > 0) {
                errorMsg = result.errors[0].message || errorMsg;
            } else if (result.message) {
                errorMsg = result.message;
            }
            termLog('Error: ' + errorMsg, 'error');
            showToast(errorMsg, 'error');
            return;
        }

        termLog('Repositori ' + repoName + ' berhasil dibuat!', 'success');
        addLog('Membuat repositori: ' + repoName);

        if (fileInput.files.length > 0) {
            btnText.textContent = 'Mengunggah file awal...';
            const file = fileInput.files[0];
            const fileCommitMsg = commitInput.value.trim() || 'Initial commit via GitUp';

            termLog('Mengunggah file awal: ' + file.name + ' ke ' + repoName, 'exec');

            const reader = new Promise(function(resolve, reject) {
                const fr = new FileReader();
                fr.onload = function() { resolve(fr.result.split(',')[1]); };
                fr.onerror = reject;
                fr.readAsDataURL(file);
            });

            const content = await reader;

            const uploadResponse = await fetch(
                'https://api.github.com/repos/' + GITHUB_USER.login + '/' + repoName + '/contents/' + file.name, {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'token ' + GITHUB_TOKEN,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: fileCommitMsg,
                        content: content
                    })
                }
            );

            if (uploadResponse.ok) {
                termLog('File ' + file.name + ' berhasil diunggah!', 'success');
                addLog('Mengunggah file: ' + file.name + ' ke ' + repoName);
            } else {
                termLog('Gagal mengunggah file awal', 'error');
            }
        }

        nameInput.value = '';
        descInput.value = '';
        fileInput.value = '';
        commitInput.value = '';
        showToast('Repositori ' + repoName + ' berhasil dibuat.', 'success');
        await loadRepos();

    } catch (error) {
        termLog('Error: ' + error.message, 'error');
        showToast('Terjadi kesalahan: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btnText.textContent = 'Buat & Terbitkan Repositori';
    }
}

async function uploadFileAction() {
    if (!GITHUB_TOKEN || !GITHUB_USER) {
        showToast('Silakan login terlebih dahulu!', 'error');
        showPage('login');
        return;
    }

    const repoSelect = document.getElementById('repo-select');
    const repoName = repoSelect.value;
    const fileInput = document.getElementById('file-input');
    const commitInput = document.getElementById('file-commit-msg');
    const btn = document.getElementById('btn-upload-file');
    const btnText = document.getElementById('btn-upload-text');

    if (!repoName) {
        showToast('Pilih repositori tujuan!', 'error');
        return;
    }

    if (fileInput.files.length === 0) {
        showToast('Pilih file yang akan diunggah!', 'error');
        return;
    }

    const commitMsg = commitInput.value.trim() || 'Upload file via GitUp';
    const files = fileInput.files;
    let successCount = 0;
    let failCount = 0;

    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    btnText.textContent = 'Mengunggah ' + files.length + ' file...';

    termLog('Memulai upload ' + files.length + ' file ke ' + repoName, 'exec');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            let sha = null;

            const checkResponse = await fetch(
                'https://api.github.com/repos/' + GITHUB_USER.login + '/' + repoName + '/contents/' + file.name, {
                    headers: {
                        'Authorization': 'token ' + GITHUB_TOKEN,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (checkResponse.ok) {
                const data = await checkResponse.json();
                sha = data.sha;
            }

            const reader = new Promise(function(resolve, reject) {
                const fr = new FileReader();
                fr.onload = function() { resolve(fr.result.split(',')[1]); };
                fr.onerror = reject;
                fr.readAsDataURL(file);
            });

            const content = await reader;

            const uploadData = {
                message: commitMsg,
                content: content
            };

            if (sha) uploadData.sha = sha;

            const uploadResponse = await fetch(
                'https://api.github.com/repos/' + GITHUB_USER.login + '/' + repoName + '/contents/' + file.name, {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'token ' + GITHUB_TOKEN,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(uploadData)
                }
            );

            if (uploadResponse.ok) {
                successCount++;
                termLog('File ' + file.name + ' berhasil diunggah', 'success');
                btnText.textContent = 'Upload ' + (i + 1) + '/' + files.length + ' selesai...';
            } else {
                failCount++;
                const result = await uploadResponse.json();
                termLog('Gagal upload ' + file.name + ': ' + (result.message || 'unknown error'), 'error');
            }

        } catch (error) {
            failCount++;
            termLog('Error upload ' + file.name + ': ' + error.message, 'error');
        }
    }

    termLog('Upload selesai: ' + successCount + ' berhasil, ' + failCount + ' gagal', successCount > 0 ? 'success' : 'error');

    if (successCount > 0) {
        addLog('Mengunggah ' + successCount + ' file ke ' + repoName);
        showToast(successCount + ' file berhasil diunggah ke ' + repoName + '.', 'success');
        fileInput.value = '';
        commitInput.value = '';
    }

    if (failCount > 0) {
        showToast(failCount + ' file gagal diunggah. Cek terminal untuk detail.', 'error');
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    btnText.textContent = 'Unggah ke Repositori';
}

async function deleteRepoAction(fullName, repoName) {
    showConfirm('Apakah Anda yakin ingin menghapus repositori "' + repoName + '"? Tindakan ini tidak dapat dibatalkan!', async function() {
        termLog('Menghapus repositori: ' + repoName, 'exec');

        try {
            const response = await fetch('https://api.github.com/repos/' + fullName, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + GITHUB_TOKEN,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 204) {
                termLog('Repositori ' + repoName + ' berhasil dihapus', 'success');
                addLog('Menghapus repositori: ' + repoName);
                showToast('Repositori ' + repoName + ' berhasil dihapus.', 'success');
                await loadRepos();
            } else if (response.status === 401) {
                termLog('Token tidak valid atau expired. Silakan login ulang.', 'error');
                showToast('Token tidak valid. Login ulang!', 'error');
                logoutAction();
            } else if (response.status === 403) {
                termLog('Anda tidak memiliki izin untuk menghapus repositori ini.', 'error');
                showToast('Tidak punya izin hapus repositori.', 'error');
            } else if (response.status === 404) {
                termLog('Repositori tidak ditemukan.', 'error');
                showToast('Repositori tidak ditemukan.', 'error');
            } else {
                const result = await response.json();
                termLog('Gagal hapus: ' + (result.message || 'Unknown error'), 'error');
                showToast('Gagal menghapus repositori: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            termLog('Error: ' + error.message, 'error');
            showToast('Terjadi kesalahan saat menghapus.', 'error');
        }
    });
}

function addLog(message) {
    const container = document.getElementById('log-container');
    const log = document.createElement('div');
    const time = new Date().toLocaleTimeString();

    log.className = 'bg-[#0f172a]/80 backdrop-blur-md p-4 rounded-2xl border border-blue-500/20 flex items-start gap-3';
    log.innerHTML = '<div class="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><i data-lucide="git-commit" class="w-3.5 h-3.5 text-blue-400"></i></div><div class="flex-1 min-w-0"><p class="text-sm text-white">' + message + '</p><span class="text-[10px] text-slate-500">' + time + '</span></div>';

    container.prepend(log);
    lucide.createIcons();
}