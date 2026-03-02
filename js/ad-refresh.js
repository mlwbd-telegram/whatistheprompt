/**
 * ad-refresh.js
 *
 * HOW IT WORKS:
 * Each ad container holds a plain <iframe> pointing to a dedicated ad HTML file
 * (ads/banner.html or ads/box.html). To refresh an ad, we simply update the
 * iframe's src with a new timestamp — the browser fetches a fresh copy of the
 * ad page, which re-runs the Adsterra scripts and serves a new ad.
 *
 * WHY THIS WORKS RELIABLY:
 *  1. Each iframe has its own window — zero atOptions collision between slots.
 *  2. Browsers do NOT cache iframe src changes. Adding ?t=<timestamp> forces
 *     a fresh HTTP request every time, so Adsterra serves a new ad.
 *  3. No script re-injection, no DOM wiping, no race conditions.
 *
 * REFRESH POLICY:
 *  - All ads refresh every 60 seconds.
 *  - Refresh is skipped when the tab is hidden (saves impressions & CPU).
 *  - A single interval is maintained (singleton guard).
 *  - Interval auto-stops when the user leaves the page.
 */

(function () {
    'use strict';

    var REFRESH_MS = 60000;               // 60 seconds
    var BANNER_SRC = 'ads/banner.html';   // 728 x 90
    var BOX_SRC = 'ads/box.html';      // 300 x 250

    // Map slot IDs → their ad page source
    var SLOTS = [
        { id: 'header-small-ad', src: BANNER_SRC, w: 728, h: 90 },
        { id: 'below-result-ad', src: BANNER_SRC, w: 728, h: 90 },
        { id: 'footer-ad-banner', src: BANNER_SRC, w: 728, h: 90 },
        { id: 'sticky-ad-container', src: BOX_SRC, w: 300, h: 250 },
        { id: 'left-sticky-ad', src: BOX_SRC, w: 300, h: 250 }
    ];

    var intervalId = null;
    var cycle = 0;

    // ── HELPERS ───────────────────────────────────────────────────────────────

    /** Create (or return existing) iframe inside a slot container. */
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

    /** Refresh one slot by updating its iframe src with a cache-buster. */
    function refreshSlot(slot) {
        var iframe = getOrCreateIframe(slot);
        if (!iframe) return;
        // Adding a timestamp query param forces the browser to fetch a new page →
        // Adsterra's scripts re-run → new ad is served.
        iframe.src = slot.src + '?t=' + Date.now();
    }

    // ── REFRESH CYCLE ─────────────────────────────────────────────────────────

    function refreshAll() {
        if (window.AD_REFRESH_DISABLED === true) { stopRefresh(); return; }
        if (document.visibilityState !== 'visible') return; // skip hidden tabs

        cycle++;
        console.debug('[ad-refresh] refresh cycle #' + cycle);
        SLOTS.forEach(refreshSlot);
    }

    // ── INTERVAL MANAGEMENT ───────────────────────────────────────────────────

    function startRefresh() {
        if (intervalId !== null) return; // singleton guard
        intervalId = setInterval(refreshAll, REFRESH_MS);
        console.debug('[ad-refresh] started — 60 s interval');
    }

    function stopRefresh() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
            console.debug('[ad-refresh] stopped');
        }
    }

    // ── INIT ──────────────────────────────────────────────────────────────────

    function init() {
        if (window.AD_REFRESH_DISABLED === true) return;

        // Load all ads immediately on page start
        SLOTS.forEach(refreshSlot);

        // Then start the 60-second refresh cycle
        startRefresh();

        // Stop on page exit
        window.addEventListener('pagehide', stopRefresh, { once: true });
        window.addEventListener('beforeunload', stopRefresh, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init(); // DOMContentLoaded already fired (defer/async usage)
    }

    // Public API — usable from DevTools console
    window.adRefresh = {
        start: startRefresh,
        stop: stopRefresh,
        now: refreshAll,       // force immediate refresh of all slots
        slot: refreshSlot       // refresh one: adRefresh.slot(SLOTS[0])
    };

}());
