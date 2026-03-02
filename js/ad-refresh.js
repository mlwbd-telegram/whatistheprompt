/**
 * ad-refresh.js — Reliable 60-second Adsterra iframe ad slot refresh.
 *
 * Why hardcoded configs? Adsterra replaces the original <script> tags with
 * iframes immediately on load, so reading keys dynamically from the DOM fails.
 * Instead we store the config here and re-inject the exact same scripts on
 * each refresh cycle.
 *
 * Policies met:
 *  - Adsterra allows iframe refresh ≥ 30 s for non-AMP placements (we use 60 s)
 *  - No main library re-injection
 *  - No page reload
 *  - Single interval (singleton guard)
 *  - Stops on tab hide resume without refresh, stops on page unload
 */

(function () {
    'use strict';

    // ── SLOT CONFIGURATION ───────────────────────────────────────────────────
    // Update keys/dimensions here if you change your Adsterra placement.
    var SLOTS = [
        {
            id: 'header-small-ad',
            key: '7b616e0dce6848244919663e545f774d',
            width: 728,
            height: 90,
            src: 'https://www.highperformanceformat.com/7b616e0dce6848244919663e545f774d/invoke.js'
        },
        {
            id: 'below-result-ad',
            key: '7b616e0dce6848244919663e545f774d',
            width: 728,
            height: 90,
            src: 'https://www.highperformanceformat.com/7b616e0dce6848244919663e545f774d/invoke.js'
        },
        {
            id: 'footer-ad-banner',
            key: '7b616e0dce6848244919663e545f774d',
            width: 728,
            height: 90,
            src: 'https://www.highperformanceformat.com/7b616e0dce6848244919663e545f774d/invoke.js'
        },
        {
            id: 'sticky-ad-container',
            key: 'e1d24c3cd11f87e62d2147e4f6ea76fa',
            width: 300,
            height: 250,
            src: 'https://www.highperformanceformat.com/e1d24c3cd11f87e62d2147e4f6ea76fa/invoke.js'
        },
        {
            id: 'left-sticky-ad',
            key: 'e1d24c3cd11f87e62d2147e4f6ea76fa',
            width: 300,
            height: 250,
            src: 'https://www.highperformanceformat.com/e1d24c3cd11f87e62d2147e4f6ea76fa/invoke.js'
        }
    ];

    var REFRESH_MS = 60000; // 60 seconds

    // ── STATE ────────────────────────────────────────────────────────────────
    var intervalId = null;
    var cycleCount = 0;

    // ── CORE: inject a fresh ad into one container ───────────────────────────
    function injectAd(slot) {
        var el = document.getElementById(slot.id);
        if (!el) return;

        // Wipe current content (iframe + old scripts)
        el.innerHTML = '';

        // 1. atOptions script (must execute before invoke.js)
        var opts = document.createElement('script');
        opts.text = "atOptions = { 'key': '" + slot.key + "', 'format': 'iframe', " +
            "'height': " + slot.height + ", 'width': " + slot.width + ", 'params': {} };";
        el.appendChild(opts);

        // 2. invoke.js — fresh request = new ad served by Adsterra
        var invoke = document.createElement('script');
        invoke.src = slot.src;
        invoke.async = true;
        el.appendChild(invoke);
    }

    // ── CYCLE: refresh all slots ─────────────────────────────────────────────
    function refreshAll() {
        // Skip if tab not visible — saves ad impressions and CPU
        if (document.visibilityState !== 'visible') return;

        // Global kill-switch for networks that forbid refresh
        if (window.AD_REFRESH_DISABLED === true) {
            stopRefresh();
            return;
        }

        cycleCount++;
        console.debug('[ad-refresh] cycle ' + cycleCount);

        SLOTS.forEach(function (slot) {
            injectAd(slot);
        });
    }

    // ── INTERVAL MANAGEMENT ──────────────────────────────────────────────────
    function startRefresh() {
        if (intervalId !== null) return;           // singleton guard
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

    // ── INITIAL LOAD: ensure all slots are populated ─────────────────────────
    function initialLoad() {
        if (window.AD_REFRESH_DISABLED === true) return;

        // Re-inject all slots once on load to guarantee they render,
        // then start the 60-second refresh cycle.
        SLOTS.forEach(function (slot) {
            injectAd(slot);
        });

        startRefresh();

        // Auto-stop when user leaves the page
        window.addEventListener('pagehide', stopRefresh, { once: true });
        window.addEventListener('beforeunload', stopRefresh, { once: true });
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialLoad);
    } else {
        // DOMContentLoaded already fired (e.g. script loaded with defer)
        initialLoad();
    }

    // Public API
    window.adRefresh = {
        start: startRefresh,
        stop: stopRefresh,
        now: refreshAll      // force immediate refresh from console
    };

}());
