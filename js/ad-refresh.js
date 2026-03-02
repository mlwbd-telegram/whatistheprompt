/**
 * ad-refresh.js — Auto-refresh Adsterra iframe ad slots every 60 seconds.
 *
 * Rules:
 *  - Only refreshes when the browser tab is VISIBLE (Page Visibility API).
 *  - Never re-injects the main Adsterra library script.
 *  - Prevents multiple stacked intervals (singleton guard).
 *  - Stops automatically when the page is unloaded.
 *  - Skips the ad modal slot (#modal-ad-slot) — that is managed by script.js.
 *  - Provides a global kill-switch: window.AD_REFRESH_DISABLED = true.
 *
 * Adsterra policy note:
 *  Adsterra allows iframe banner refresh ≥ 30 seconds for non-AMP placements.
 *  This implementation uses 60 s (well within policy).
 *  If you switch networks, set window.AD_REFRESH_DISABLED = true in your page.
 */

(function () {
    'use strict';

    // ── CONFIG ──────────────────────────────────────────────────────────────
    const REFRESH_INTERVAL_MS = 60_000;   // 60 seconds

    // Selector for all refreshable ad containers.
    // Each container must have a data-at-key and data-at-width/height attribute,
    // OR we fall back to reading the stored options from the dataset below.
    const AD_SLOT_IDS = [
        'header-small-ad',
        'below-result-ad',
        'footer-ad-banner',
        'sticky-ad-container',
        'left-sticky-ad',
    ];

    // Skip this slot — it is handled by script.js ad-modal logic.
    const SKIP_IDS = new Set(['modal-ad-slot']);

    // ── STATE ────────────────────────────────────────────────────────────────
    let intervalId = null;
    let refreshCount = 0;

    // ── HELPERS ──────────────────────────────────────────────────────────────

    /**
     * Re-inject the atOptions + invoke.js pair into a container.
     * We read the original key/dimensions from data-* attributes that we
     * stamp onto the container at init time.
     */
    function refreshSlot(container) {
        const key = container.dataset.adKey;
        const width = container.dataset.adWidth;
        const height = container.dataset.adHeight;
        const src = container.dataset.adSrc;

        if (!key || !src) return; // safety: slot was never initialised

        // Remove all children (old iframe + old scripts) without touching the
        // container element itself, so layout is fully preserved.
        container.innerHTML = '';

        // Re-inject atOptions
        const opts = document.createElement('script');
        opts.textContent = `atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`;
        container.appendChild(opts);

        // Re-inject invoke.js — browser treats a newly appended script element
        // as a fresh request, so the ad network serves a new ad.
        const invoke = document.createElement('script');
        invoke.src = src;
        invoke.async = true;
        container.appendChild(invoke);
    }

    /**
     * Snapshot the original key & dimensions from the slot's inline scripts,
     * then store them as data-* attributes for later re-injection.
     */
    function initSlot(container) {
        // Look for the atOptions inline script inside the container.
        const scripts = container.querySelectorAll('script');
        let key = null, width = null, height = null, src = null;

        scripts.forEach(function (s) {
            if (s.src && s.src.includes('highperformanceformat.com')) {
                src = s.src;
            }
            if (s.textContent && s.textContent.includes('atOptions')) {
                // Parse key
                const keyMatch = s.textContent.match(/'key'\s*:\s*'([^']+)'/);
                if (keyMatch) key = keyMatch[1];
                // Parse width
                const wMatch = s.textContent.match(/'width'\s*:\s*(\d+)/);
                if (wMatch) width = wMatch[1];
                // Parse height
                const hMatch = s.textContent.match(/'height'\s*:\s*(\d+)/);
                if (hMatch) height = hMatch[1];
            }
        });

        if (!key || !src) return false; // can't refresh this slot

        container.dataset.adKey = key;
        container.dataset.adWidth = width || '728';
        container.dataset.adHeight = height || '90';
        container.dataset.adSrc = src;

        return true;
    }

    /**
     * Run one refresh cycle across all tracked slots.
     */
    function runRefreshCycle() {
        // Kill-switch check
        if (window.AD_REFRESH_DISABLED === true) {
            stopRefresh();
            return;
        }

        // Only refresh while the tab is visible
        if (document.visibilityState !== 'visible') return;

        refreshCount++;
        console.debug(`[ad-refresh] cycle #${refreshCount}`);

        AD_SLOT_IDS.forEach(function (id) {
            if (SKIP_IDS.has(id)) return;
            const el = document.getElementById(id);
            if (el && el.dataset.adKey) {
                refreshSlot(el);
            }
        });
    }

    // ── LIFECYCLE ────────────────────────────────────────────────────────────

    function startRefresh() {
        // Singleton guard — never stack multiple intervals
        if (intervalId !== null) return;

        intervalId = setInterval(runRefreshCycle, REFRESH_INTERVAL_MS);
        console.debug('[ad-refresh] started (60 s interval)');
    }

    function stopRefresh() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
            console.debug('[ad-refresh] stopped');
        }
    }

    // ── INIT ─────────────────────────────────────────────────────────────────

    function init() {
        // Respect global kill-switch
        if (window.AD_REFRESH_DISABLED === true) return;

        let slots = 0;
        AD_SLOT_IDS.forEach(function (id) {
            if (SKIP_IDS.has(id)) return;
            const el = document.getElementById(id);
            if (el && initSlot(el)) slots++;
        });

        if (slots === 0) {
            console.debug('[ad-refresh] no valid slots found, refresh not started');
            return;
        }

        console.debug(`[ad-refresh] initialised ${slots} slot(s)`);
        startRefresh();

        // Stop on page unload to prevent zombie intervals
        window.addEventListener('pagehide', stopRefresh, { once: true });
        window.addEventListener('beforeunload', stopRefresh, { once: true });
    }

    // Wait until the DOM is fully loaded before scanning for ad containers.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose stop/start for external control (e.g. from script.js)
    window.adRefresh = { start: startRefresh, stop: stopRefresh };

}());
