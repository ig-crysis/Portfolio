(function () {
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function reinitGallery() {
        if (typeof VenoBox !== 'undefined') {
            try {
                new VenoBox({
                    selector: '.project-gallery-link',
                    fitView: false,
                    onPostOpen: function () { document.querySelector('body').style.overflowY = 'hidden'; },
                    onPreClose: function () { document.querySelector('body').style.overflowY = 'auto'; }
                });
            } catch (e) { /* venobox not ready, ignore */ }
        }
    }

    function homeCardHtml(p, galleryId) {
        return (
            '<div class="group relative overflow-hidden rounded-lg bg-light p-4 pb-0 dark:bg-dark-2 md:p-6 md:pb-0">' +
                '<div class="relative aspect-6/4 overflow-hidden rounded-t-lg">' +
                    '<a href="' + escapeHtml(p.link) + '" target="_blank" rel="noopener">' +
                        '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.title) + '" class="h-full w-full rounded-t-lg object-cover object-top transition" />' +
                    '</a>' +
                    '<a href="' + escapeHtml(p.image) + '" data-gall="' + galleryId + '" class="project-gallery-link absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full bg-white text-primary shadow-lg transition lg:invisible lg:-translate-y-[40%] lg:opacity-0 lg:group-hover:visible lg:group-hover:-translate-y-1/2 lg:group-hover:opacity-100">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" class="h-6 w-6"><path d="M10 4.167v11.666M4.167 10h11.666" /></svg>' +
                    '</a>' +
                '</div>' +
                '<div class="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/20 p-4">' +
                    '<span class="rounded bg-white px-2 py-1 text-xs font-medium text-primary shadow">' + escapeHtml(p.tag) + '</span>' +
                '</div>' +
            '</div>'
        );
    }

    function worksCardHtml(p, galleryId) {
        return (
            '<div class="">' +
                '<div class="group relative overflow-hidden rounded-lg bg-light p-4 pb-0 dark:bg-dark-2 md:p-6 md:pb-0 xl:p-10 xl:pb-0">' +
                    '<div class="relative aspect-6/4 overflow-hidden rounded-t-lg">' +
                        '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.title) + '" class="h-full w-full rounded-t-lg object-cover object-top transition" />' +
                        '<a href="' + escapeHtml(p.image) + '" data-gall="' + galleryId + '" class="project-gallery-link absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full bg-white text-primary shadow-lg transition lg:invisible lg:-translate-y-[40%] lg:opacity-0 lg:group-hover:visible lg:group-hover:-translate-y-1/2 lg:group-hover:opacity-100">' +
                            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" class="h-6 w-6"><path d="M10 4.167v11.666M4.167 10h11.666" /></svg>' +
                        '</a>' +
                    '</div>' +
                '</div>' +
                '<div class="flex flex-wrap items-start justify-between py-4 md:p-6">' +
                    '<div class="">' +
                        '<h3 class="text-lg font-medium md:text-xl lg:text-2xl">' +
                            '<a href="' + escapeHtml(p.link) + '" target="_blank" rel="noopener" class="border-b border-transparent text-dark transition hover:border-b-primary hover:text-primary dark:text-light/80 dark:hover:text-primary">' +
                                escapeHtml(p.title) +
                            '</a>' +
                        '</h3>' +
                        '<p class="text-sm text-muted lg:text-base">' + escapeHtml(p.description || p.tag) + '</p>' +
                    '</div>' +
                    '<a href="' + escapeHtml(p.link) + '" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-1 rounded bg-white px-3 py-2 text-center text-sm leading-none text-dark transition hover:text-primary dark:bg-black dark:text-light/70 dark:hover:text-primary">' +
                        '<span>' + escapeHtml(p.linkLabel || 'Visit Site') + '</span>' +
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0"><path d="m9.917 4.583-5.834 5.834m.584-5.834h5.25v5.25" /></svg>' +
                    '</a>' +
                '</div>' +
            '</div>'
        );
    }

    function fetchProjects(scope) {
        return fetch('data/projects.json', { cache: 'no-store' })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var projects = (data && data.projects) || [];
                projects = projects.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
                projects = projects.filter(function (p) { return !!p.published; });
                if (scope === 'home') {
                    projects = projects.filter(function (p) { return !!p.featured; });
                }
                return projects;
            })
            .catch(function () { return []; });
    }

    function initHome() {
        var container = document.getElementById('recent-projects-list');
        if (!container) return;
        fetchProjects('home').then(function (projects) {
            if (!projects.length) {
                container.innerHTML = '<p class="text-muted">No featured projects yet.</p>';
                return;
            }
            container.innerHTML = projects.map(function (p, i) {
                return homeCardHtml(p, 'project-gallery-home');
            }).join('');
            reinitGallery();
        });
    }

    function initWorks() {
        var container = document.getElementById('works-projects-list');
        var pager = document.getElementById('works-pagination');
        if (!container) return;

        fetchProjects('all').then(function (projects) {
            if (!projects.length) {
                container.innerHTML = '<p class="text-muted">No projects to show yet.</p>';
                if (pager) pager.innerHTML = '';
                return;
            }

            var perPage = 3;
            var totalPages = Math.max(1, Math.ceil(projects.length / perPage));
            var params = new URLSearchParams(window.location.search);
            var page = parseInt(params.get('page'), 10);
            if (!page || page < 1 || page > totalPages) page = 1;

            function renderPage(p) {
                page = p;
                var start = (page - 1) * perPage;
                var pageItems = projects.slice(start, start + perPage);
                container.innerHTML = pageItems.map(function (item) {
                    return worksCardHtml(item, 'project-gallery-works');
                }).join('');
                reinitGallery();
                renderPager();
                var newUrl = window.location.pathname + (page > 1 ? '?page=' + page : '');
                window.history.replaceState({}, '', newUrl);
            }

            function pageBtn(label, targetPage, opts) {
                opts = opts || {};
                var disabled = opts.disabled ? ' admin-disabled' : '';
                var active = opts.active ? ' active' : '';
                var cls = 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-light text-center text-dark transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-50 dark:border-dark dark:text-muted dark:hover:border-primary dark:hover:text-primary' + active;
                var a = document.createElement('a');
                a.href = '#';
                a.className = cls;
                a.innerHTML = label;
                if (opts.disabled) {
                    a.style.pointerEvents = 'none';
                    a.style.opacity = '0.5';
                } else {
                    a.addEventListener('click', function (e) {
                        e.preventDefault();
                        renderPage(targetPage);
                        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                }
                return a;
            }

            function renderPager() {
                if (!pager) return;
                pager.innerHTML = '';
                var prevSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>';
                var nextSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>';

                pager.appendChild(pageBtn(prevSvg, page - 1, { disabled: page <= 1 }));
                for (var i = 1; i <= totalPages; i++) {
                    pager.appendChild(pageBtn(String(i), i, { active: i === page }));
                }
                pager.appendChild(pageBtn(nextSvg, page + 1, { disabled: page >= totalPages }));
            }

            renderPage(page);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initHome();
        initWorks();
    });
})();
