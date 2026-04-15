/**
 * ad-refresh.js
 *
 * Refreshes banner ad iframes every 60 seconds (tab-visible only).
 * Only manages the two clean banner slots: top and footer.
 * No side sticky ads. No popunders.
 */

(function () {
    'use strict';

    var REFRESH_MS = 60000;               // 60 seconds
    var BANNER_SRC = 'ads/banner.html';   // responsive banner

    // Only top + footer banner slots remain
    var SLOTS = [
        { id: 'top-ad-banner',    src: BANNER_SRC, w: 728, h: 90 },
        { id: 'footer-ad-banner', src: BANNER_SRC, w: 728, h: 90 },
        { id: 'below-result-ad',  src: BANNER_SRC, w: 728, h: 90 }
    ];

    var intervalId = null;
    var cycle = 0;

    function getOrCreateIframe(slot) {
        var el = document.getElementById(slot.id);
        if (!el) return null;

        var iframe = el.querySelector('iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.width = String(slot.w);
            iframe.height = String(slot.h);
            iframe.frameBorder = '0';
            iframe.scrolling = 'no';
            iframe.style.cssText = 'display:block;border:none;max-width:100%;';
            el.appendChild(iframe);
        }
        return iframe;
    }

    function refreshSlot(slot) {
        var iframe = getOrCreateIframe(slot);
        if (!iframe) return;
        iframe.src = slot.src + '?t=' + Date.now();
    }

    function refreshAll() {
        if (window.AD_REFRESH_DISABLED === true) { stopRefresh(); return; }
        if (document.visibilityState !== 'visible') return;

        cycle++;
        SLOTS.forEach(refreshSlot);
    }

    function startRefresh() {
        if (intervalId !== null) return;
        intervalId = setInterval(refreshAll, REFRESH_MS);
    }

    function stopRefresh() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function init() {
        if (window.AD_REFRESH_DISABLED === true) return;

        // Load all ads immediately
        SLOTS.forEach(refreshSlot);

        // Start 60-second refresh cycle
        startRefresh();

        window.addEventListener('pagehide', stopRefresh, { once: true });
        window.addEventListener('beforeunload', stopRefresh, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.adRefresh = {
        start: startRefresh,
        stop: stopRefresh,
        now: refreshAll,
        slot: refreshSlot
    };

}());
