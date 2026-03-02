/**
 * ad-refresh.js
 * Loads Adsterra ads into empty div containers sequentially (400ms apart)
 * to prevent atOptions global variable collision.
 * Refreshes all slots every 60 seconds (only when tab is visible).
 */

(function () {
    'use strict';

    var SLOT_DELAY_MS = 400;   // gap between each slot injection
    var REFRESH_MS = 60000; // 60-second refresh cycle

    var SLOTS = [
        { id: 'header-small-ad', key: '7b616e0dce6848244919663e545f774d', w: 728, h: 90 },
        { id: 'below-result-ad', key: '7b616e0dce6848244919663e545f774d', w: 728, h: 90 },
        { id: 'footer-ad-banner', key: '7b616e0dce6848244919663e545f774d', w: 728, h: 90 },
        { id: 'sticky-ad-container', key: 'e1d24c3cd11f87e62d2147e4f6ea76fa', w: 300, h: 250 },
        { id: 'left-sticky-ad', key: 'e1d24c3cd11f87e62d2147e4f6ea76fa', w: 300, h: 250 }
    ];

    var intervalId = null;
    var cycle = 0;

    /**
     * Inject ONE ad slot. Uses a plain global atOptions + invoke.js script pair.
     * Because each slot waits SLOT_DELAY_MS before the next one fires,
     * only one atOptions value is "live" at a time — no collision.
     */
    function injectSlot(slot) {
        var el = document.getElementById(slot.id);
        if (!el) return;

        el.innerHTML = '';

        // Set atOptions globally — safe because we stagger each slot
        window.atOptions = {
            'key': slot.key,
            'format': 'iframe',
            'height': slot.h,
            'width': slot.w,
            'params': {}
        };

        // Dynamically create and append the invoke script
        var s = document.createElement('script');
        s.src = 'https://www.highperformanceformat.com/' + slot.key + '/invoke.js';
        s.async = false; // synchronous so it reads atOptions immediately
        el.appendChild(s);
    }

    /**
     * Load all slots one by one with a SLOT_DELAY_MS gap between each.
     */
    function loadAllSequentially() {
        SLOTS.forEach(function (slot, index) {
            setTimeout(function () {
                injectSlot(slot);
            }, index * SLOT_DELAY_MS);
        });
    }

    /**
     * Refresh cycle: only runs when tab is visible.
     */
    function refreshAll() {
        if (window.AD_REFRESH_DISABLED === true) { stopRefresh(); return; }
        if (document.visibilityState !== 'visible') return;
        cycle++;
        console.debug('[ad-refresh] refresh cycle #' + cycle);
        loadAllSequentially();
    }

    function startRefresh() {
        if (intervalId !== null) return; // singleton
        intervalId = setInterval(refreshAll, REFRESH_MS);
        console.debug('[ad-refresh] started — 60 s interval');
    }

    function stopRefresh() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function init() {
        if (window.AD_REFRESH_DISABLED === true) return;

        // Load ads immediately on page load
        loadAllSequentially();

        // Start refresh timer after all slots have loaded (give them room to settle)
        var initDelay = SLOTS.length * SLOT_DELAY_MS + 1000;
        setTimeout(startRefresh, initDelay);

        window.addEventListener('pagehide', stopRefresh, { once: true });
        window.addEventListener('beforeunload', stopRefresh, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    window.adRefresh = {
        start: startRefresh,
        stop: stopRefresh,
        now: refreshAll,
        reload: loadAllSequentially
    };

}());
