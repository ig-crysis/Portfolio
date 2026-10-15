(function () {
    var STORAGE_KEY = 'introChoiceMade';

    var overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    var choiceScreen = document.getElementById('choice-screen');
    var videoScreen = document.getElementById('video-screen');
    var video = document.getElementById('intro-video');
    var skipBtn = document.getElementById('intro-skip');
    var introBtn = document.getElementById('choice-intro');
    var dashboardBtn = document.getElementById('choice-dashboard');
    var html = document.documentElement;

    function markChosen() {
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
    }

    function hideOverlay() {
        if (!overlay || overlay.dataset.hidden === '1') return;
        overlay.dataset.hidden = '1';
        markChosen();
        overlay.classList.add('intro-hidden');
        html.classList.remove('intro-lock');
        window.setTimeout(function () {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 1050);
    }

    function playIntro() {
        markChosen();
        if (!video) { hideOverlay(); return; }

        choiceScreen.style.display = 'none';
        videoScreen.style.display = 'block';

        video.addEventListener('ended', hideOverlay);
        video.addEventListener('error', hideOverlay);

        // Triggered by a direct click, so browsers allow unmuted autoplay here.
        video.muted = false;
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {
                // Some browsers may still block unmuted playback; fall back
                // to muted rather than leaving the visitor stuck.
                video.muted = true;
                video.play().catch(hideOverlay);
            });
        }

        // Safety net: if the file never starts loading (missing/slow), don't
        // trap the visitor on a black screen indefinitely.
        window.setTimeout(function () {
            if (video.readyState === 0) hideOverlay();
        }, 8000);
    }

    html.classList.add('intro-lock');

    if (introBtn) introBtn.addEventListener('click', playIntro);
    if (dashboardBtn) dashboardBtn.addEventListener('click', hideOverlay);
    if (skipBtn) skipBtn.addEventListener('click', hideOverlay);
})();
