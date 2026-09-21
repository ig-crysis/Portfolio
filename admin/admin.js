(function () {
    var CONFIG_KEY = 'portfolioCmsConfig';
    var PROJECTS_PATH = 'data/projects.json';
    var UPLOAD_DIR = 'assets/img/projects';

    var connectScreen = document.getElementById('connect-screen');
    var dashboardScreen = document.getElementById('dashboard-screen');
    var editorScreen = document.getElementById('editor-screen');

    var state = {
        config: null,
        editingId: null,
    };

    // ---------- config / localStorage ----------

    function loadConfig() {
        try {
            var raw = localStorage.getItem(CONFIG_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function saveConfig(cfg) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    }

    function clearConfig() {
        localStorage.removeItem(CONFIG_KEY);
    }

    // ---------- base64 helpers ----------

    function utf8ToB64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    }

    function b64ToUtf8(str) {
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    function fileToBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                var result = reader.result;
                var comma = result.indexOf(',');
                resolve(result.slice(comma + 1));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ---------- GitHub API ----------

    function ghUrl(path) {
        return 'https://api.github.com/repos/' + state.config.owner + '/' + state.config.repo + '/contents/' + path;
    }

    function ghHeaders() {
        // Note: only headers GitHub's CORS policy allows may be sent from the
        // browser (Authorization, Content-Type, Accept). X-GitHub-Api-Version
        // is deliberately omitted — it isn't in GitHub's CORS allow-list and
        // including it makes every request fail the preflight check.
        return {
            'Authorization': 'Bearer ' + state.config.token,
            'Accept': 'application/vnd.github+json',
        };
    }

    function ghGetFile(path) {
        var url = ghUrl(path) + '?ref=' + encodeURIComponent(state.config.branch) + '&_=' + Date.now();
        return fetch(url, { headers: ghHeaders(), cache: 'no-store' }).then(function (res) {
            if (res.status === 404) return null;
            if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || ('GitHub API error ' + res.status)); });
            return res.json();
        });
    }

    function ghPutFile(path, base64Content, sha, message) {
        var body = {
            message: message,
            content: base64Content,
            branch: state.config.branch,
        };
        if (sha) body.sha = sha;
        return fetch(ghUrl(path), {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
            body: JSON.stringify(body),
        }).then(function (res) {
            if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || ('GitHub API error ' + res.status)); });
            return res.json();
        });
    }

    function ghDeleteFile(path, sha, message) {
        return fetch(ghUrl(path), {
            method: 'DELETE',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
            body: JSON.stringify({ message: message, sha: sha, branch: state.config.branch }),
        }).catch(function () { /* best-effort */ });
    }

    function loadProjects() {
        return ghGetFile(PROJECTS_PATH).then(function (file) {
            if (!file) return { projects: [], sha: null };
            var json = JSON.parse(b64ToUtf8(file.content));
            var projects = (json.projects || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
            return { projects: projects, sha: file.sha };
        });
    }

    function saveProjects(projects, message) {
        // Re-fetch sha right before writing to minimize overwrite risk.
        return ghGetFile(PROJECTS_PATH).then(function (current) {
            var sha = current ? current.sha : null;
            var body = utf8ToB64(JSON.stringify({ projects: projects }, null, 4));
            return ghPutFile(PROJECTS_PATH, body, sha, message);
        });
    }

    function nextOrder(projects) {
        var max = 0;
        projects.forEach(function (p) { max = Math.max(max, p.order || 0); });
        return max + 1;
    }

    function generateId(title, projects) {
        var slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
        var id = slug, n = 1;
        var ids = projects.map(function (p) { return p.id; });
        while (ids.indexOf(id) !== -1) {
            n++;
            id = slug + '-' + n;
        }
        return id;
    }

    // ---------- screens ----------

    function showScreen(name) {
        connectScreen.style.display = name === 'connect' ? 'flex' : 'none';
        dashboardScreen.style.display = name === 'dashboard' ? 'block' : 'none';
        editorScreen.style.display = name === 'editor' ? 'block' : 'none';
    }

    function setStatus(el, msg, isError) {
        if (!msg) { el.style.display = 'none'; return; }
        el.textContent = msg;
        el.className = 'admin-alert ' + (isError ? 'admin-alert-error' : 'admin-alert-success');
        el.style.display = 'block';
    }

    // ---------- dashboard ----------

    function renderDashboard() {
        var list = document.getElementById('project-list');
        list.innerHTML = '<p>Loading…</p>';
        loadProjects().then(function (data) {
            var projects = data.projects;
            if (!projects.length) {
                list.innerHTML = '<p>No projects yet. Click "Add Project" to create your first one.</p>';
                return;
            }
            list.innerHTML = '';
            projects.forEach(function (p, i) {
                var row = document.createElement('div');
                row.className = 'admin-project-row';
                row.innerHTML =
                    '<img src="../' + escapeAttr(p.image || '') + '" alt="" class="admin-thumb" />' +
                    '<div class="admin-project-info">' +
                        '<strong>' + escapeHtml(p.title) + '</strong>' +
                        '<span class="admin-muted">' + escapeHtml(p.tag || '') + '</span>' +
                        '<span class="admin-muted admin-link-preview">' + escapeHtml(p.link || '') + '</span>' +
                    '</div>' +
                    '<div class="admin-project-flags">' +
                        '<button type="button" class="admin-tag-btn js-toggle-featured ' + (p.featured ? 'is-on' : '') + '">' + (p.featured ? 'Featured ✓' : 'Not Featured') + '</button>' +
                        '<button type="button" class="admin-tag-btn js-toggle-published ' + (p.published ? 'is-on' : '') + '">' + (p.published ? 'Published ✓' : 'Hidden') + '</button>' +
                    '</div>' +
                    '<div class="admin-project-actions">' +
                        '<button type="button" class="admin-icon-btn js-move-up" ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
                        '<button type="button" class="admin-icon-btn js-move-down" ' + (i === projects.length - 1 ? 'disabled' : '') + '>↓</button>' +
                        '<button type="button" class="admin-btn js-edit">Edit</button>' +
                        '<button type="button" class="admin-btn admin-btn-danger js-delete">Delete</button>' +
                    '</div>';

                row.querySelector('.js-toggle-featured').addEventListener('click', function () { toggleFlag(p.id, 'featured'); });
                row.querySelector('.js-toggle-published').addEventListener('click', function () { toggleFlag(p.id, 'published'); });
                row.querySelector('.js-move-up').addEventListener('click', function () { move(p.id, -1); });
                row.querySelector('.js-move-down').addEventListener('click', function () { move(p.id, 1); });
                row.querySelector('.js-edit').addEventListener('click', function () { openEditor(p.id); });
                row.querySelector('.js-delete').addEventListener('click', function () { deleteProject(p); });

                list.appendChild(row);
            });
        }).catch(function (err) {
            list.innerHTML = '';
            setStatus(document.getElementById('dashboard-status'), 'Error loading projects: ' + err.message, true);
        });
    }

    function toggleFlag(id, field) {
        var statusEl = document.getElementById('dashboard-status');
        setStatus(statusEl, 'Saving…', false);
        loadProjects().then(function (data) {
            var projects = data.projects;
            projects.forEach(function (p) { if (p.id === id) p[field] = !p[field]; });
            return saveProjects(projects, 'Update ' + field + ' for ' + id);
        }).then(function () {
            setStatus(statusEl, 'Saved. Live site updates in about a minute.', false);
            renderDashboard();
        }).catch(function (err) {
            setStatus(statusEl, 'Error: ' + err.message, true);
        });
    }

    function move(id, dir) {
        var statusEl = document.getElementById('dashboard-status');
        setStatus(statusEl, 'Saving…', false);
        loadProjects().then(function (data) {
            var projects = data.projects;
            var index = projects.findIndex(function (p) { return p.id === id; });
            var swapWith = index + dir;
            if (index < 0 || swapWith < 0 || swapWith >= projects.length) return null;
            var a = projects[index].order || index;
            var b = projects[swapWith].order || swapWith;
            projects[index].order = b;
            projects[swapWith].order = a;
            return saveProjects(projects, 'Reorder ' + id);
        }).then(function (result) {
            if (result === null) { setStatus(statusEl, '', false); return; }
            setStatus(statusEl, 'Saved.', false);
            renderDashboard();
        }).catch(function (err) {
            setStatus(statusEl, 'Error: ' + err.message, true);
        });
    }

    function deleteProject(project) {
        if (!confirm('Delete "' + project.title + '"? This cannot be undone.')) return;
        var statusEl = document.getElementById('dashboard-status');
        setStatus(statusEl, 'Deleting…', false);
        loadProjects().then(function (data) {
            var projects = data.projects.filter(function (p) { return p.id !== project.id; });
            return saveProjects(projects, 'Delete project: ' + project.title);
        }).then(function () {
            if (project.image && project.image.indexOf(UPLOAD_DIR + '/') === 0) {
                return ghGetFile(project.image).then(function (file) {
                    if (file) return ghDeleteFile(project.image, file.sha, 'Remove image for deleted project: ' + project.title);
                });
            }
        }).then(function () {
            setStatus(statusEl, 'Deleted.', false);
            renderDashboard();
        }).catch(function (err) {
            setStatus(statusEl, 'Error: ' + err.message, true);
        });
    }

    // ---------- editor ----------

    function openEditor(id) {
        state.editingId = id || null;
        document.getElementById('editor-title').textContent = id ? 'Edit Project' : 'Add Project';
        document.getElementById('editor-form').reset();
        document.getElementById('f-image-preview').style.display = 'none';
        setStatus(document.getElementById('editor-error'), '', true);
        setStatus(document.getElementById('editor-status'), '', false);

        if (id) {
            loadProjects().then(function (data) {
                var p = data.projects.find(function (x) { return x.id === id; });
                if (!p) return;
                document.getElementById('f-title').value = p.title || '';
                document.getElementById('f-tag').value = p.tag || '';
                document.getElementById('f-description').value = p.description || '';
                document.getElementById('f-link').value = p.link || '';
                document.getElementById('f-linklabel').value = p.linkLabel || '';
                document.getElementById('f-image-url').value = p.image || '';
                document.getElementById('f-featured').checked = !!p.featured;
                document.getElementById('f-published').checked = !!p.published;
                if (p.image) {
                    var preview = document.getElementById('f-image-preview');
                    preview.src = '../' + p.image;
                    preview.style.display = 'block';
                }
            });
        } else {
            document.getElementById('f-published').checked = true;
        }

        showScreen('editor');
    }

    function submitEditor(e) {
        e.preventDefault();
        var errEl = document.getElementById('editor-error');
        var statusEl = document.getElementById('editor-status');
        setStatus(errEl, '', true);
        setStatus(statusEl, '', false);

        var title = document.getElementById('f-title').value.trim();
        var link = document.getElementById('f-link').value.trim();
        var imageUrlField = document.getElementById('f-image-url').value.trim();
        var fileInput = document.getElementById('f-image-file');
        var file = fileInput.files[0];

        if (!title) { setStatus(errEl, 'Title is required.', true); return; }
        if (!link) { setStatus(errEl, 'Link is required.', true); return; }
        if (!file && !imageUrlField) { setStatus(errEl, 'Provide an image: upload a file or paste a path/URL.', true); return; }
        if (file && file.size > 5 * 1024 * 1024) { setStatus(errEl, 'Image must be smaller than 5MB.', true); return; }

        var submitBtn = document.getElementById('editor-submit');
        submitBtn.disabled = true;
        setStatus(statusEl, 'Saving…', false);

        var uploadPromise;
        if (file) {
            var ext = file.name.split('.').pop().toLowerCase();
            var allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
            if (allowed.indexOf(ext) === -1) {
                submitBtn.disabled = false;
                setStatus(errEl, 'Image must be one of: ' + allowed.join(', '), true);
                return;
            }
            var slug = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            var filename = slug + '-' + Math.random().toString(16).slice(2, 10) + '.' + ext;
            var path = UPLOAD_DIR + '/' + filename;
            uploadPromise = fileToBase64(file).then(function (b64) {
                return ghPutFile(path, b64, null, 'Upload image: ' + filename);
            }).then(function () { return path; });
        } else {
            uploadPromise = Promise.resolve(imageUrlField);
        }

        uploadPromise.then(function (imagePath) {
            return loadProjects().then(function (data) {
                var projects = data.projects;
                var form = {
                    title: title,
                    tag: document.getElementById('f-tag').value.trim(),
                    description: document.getElementById('f-description').value.trim(),
                    link: link,
                    linkLabel: document.getElementById('f-linklabel').value.trim() || 'Visit Site',
                    image: imagePath,
                    featured: document.getElementById('f-featured').checked,
                    published: document.getElementById('f-published').checked,
                };

                if (state.editingId) {
                    projects = projects.map(function (p) {
                        return p.id === state.editingId ? Object.assign({}, p, form) : p;
                    });
                    return saveProjects(projects, 'Update project: ' + title);
                } else {
                    form.id = generateId(title, projects);
                    form.order = nextOrder(projects);
                    projects.push(form);
                    return saveProjects(projects, 'Add project: ' + title);
                }
            });
        }).then(function () {
            submitBtn.disabled = false;
            showScreen('dashboard');
            renderDashboard();
        }).catch(function (err) {
            submitBtn.disabled = false;
            setStatus(errEl, 'Error: ' + err.message, true);
        });
    }

    // ---------- connect ----------

    function attemptConnect(e) {
        e.preventDefault();
        var errEl = document.getElementById('connect-error');
        setStatus(errEl, '', true);

        var cfg = {
            owner: document.getElementById('cfg-owner').value.trim(),
            repo: document.getElementById('cfg-repo').value.trim(),
            branch: document.getElementById('cfg-branch').value.trim() || 'main',
            token: document.getElementById('cfg-token').value.trim(),
        };
        if (!cfg.owner || !cfg.repo || !cfg.token) {
            setStatus(errEl, 'Fill in all fields.', true);
            return;
        }

        var submitBtn = document.getElementById('connect-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting…';

        state.config = cfg;
        fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, { headers: ghHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error(res.status === 404 ? 'Repo not found, or token lacks access.' : 'Invalid token or connection error (' + res.status + ').');
                return res.json();
            })
            .then(function () {
                saveConfig(cfg);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Connect';
                showScreen('dashboard');
                renderDashboard();
            })
            .catch(function (err) {
                state.config = null;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Connect';
                setStatus(errEl, err.message, true);
            });
    }

    function disconnect() {
        if (!confirm('Disconnect and forget the saved token on this device?')) return;
        clearConfig();
        state.config = null;
        showScreen('connect');
    }

    // ---------- utils ----------

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }

    // ---------- init ----------

    document.getElementById('connect-form').addEventListener('submit', attemptConnect);
    document.getElementById('btn-disconnect').addEventListener('click', disconnect);
    document.getElementById('btn-add').addEventListener('click', function () { openEditor(null); });
    document.getElementById('btn-back').addEventListener('click', function () { showScreen('dashboard'); renderDashboard(); });
    document.getElementById('editor-form').addEventListener('submit', submitEditor);

    document.getElementById('f-image-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        var preview = document.getElementById('f-image-preview');
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            preview.src = reader.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    var existing = loadConfig();
    if (existing) {
        state.config = existing;
        document.getElementById('cfg-owner').value = existing.owner || '';
        document.getElementById('cfg-repo').value = existing.repo || '';
        document.getElementById('cfg-branch').value = existing.branch || 'main';
        showScreen('dashboard');
        renderDashboard();
    } else {
        showScreen('connect');
    }
})();
