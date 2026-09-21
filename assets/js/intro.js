(function () {
    var overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    var video = document.getElementById('intro-video');
    var skipBtn = document.getElementById('intro-skip');
    var unmuteBtn = document.getElementById('intro-unmute');
    var html = document.documentElement;

    function hideOverlay() {
        if (!overlay || overlay.dataset.hidden === '1') return;
        overlay.dataset.hidden = '1';
        try { sessionStorage.setItem('introPlayed', '1'); } catch (e) { /* ignore */ }
        overlay.classList.add('intro-hidden');
        html.classList.remove('intro-lock');
        window.setTimeout(function () {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 1050);
    }

    html.classList.add('intro-lock');

    if (skipBtn) {
        skipBtn.addEventListener('click', hideOverlay);
    }

    if (unmuteBtn && video) {
        unmuteBtn.addEventListener('click', function () {
            video.muted = !video.muted;
            unmuteBtn.textContent = video.muted ? '🔇 Unmute' : '🔊 Mute';
        });
    }

    if (video) {
        video.addEventListener('ended', hideOverlay);
        video.addEventListener('error', hideOverlay);
        // If the video file isn't available yet (e.g. not uploaded), don't
        // trap visitors behind a black screen.
        window.setTimeout(function () {
            if (video.readyState === 0) hideOverlay();
        }, 4000);
    } else {
        hideOverlay();
    }
})();
