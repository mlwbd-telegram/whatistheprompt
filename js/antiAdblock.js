/**
 * antiAdblock.js — Multi-Layer Anti-AdBlock Detection
 * =====================================================
 * 5-layer detection, zero global leakage, IIFE-wrapped.
 * Policy-safe: restricts access only, never bypasses blockers.
 */

(function () {
    'use strict';

    /* ─── Constants ──────────────────────────────────────────────── */
    var _AD_KEY = '7b616e0dce6848244919663e545f774d';
    var _AD_HOST = 'https://www.highperformanceformat.com';
    var _AD_SRC = _AD_HOST + '/' + _AD_KEY + '/invoke.js';

    /* Selectors for ad containers on the page (generate.html slots) */
    var _SLOT_IDS = [
        'header-small-ad',
        'below-result-ad',
        'footer-ad-banner',
        'home-ad-banner',       // index.html
        'footer-ad-banner',
    ];

    var _RECHECK_INTERVAL = 15000; // 15 s periodic recheck
    var _SCRIPT_TIMEOUT = 4000;  // 4 s for ad script load
    var _RENDER_DELAY = 5000;  // 5 s to let ad render
    var _OVERLAY_ID = 'aab-overlay';
    var _BAIT_ID = 'aab-bait';

    /* ─── Internal state (closure — never exposed globally) ───────── */
    var _blocked = false;
    var _recheckTimer = null;
    var _scriptVerified = false;
    var _initialPassed = false;

    /* ═══════════════════════════════════════════════════════════════
       LAYER 1 — Bait Element Detection
       ═══════════════════════════════════════════════════════════════ */
    function _checkBait() {
        var bait = document.getElementById(_BAIT_ID);
        if (!bait) return false; // bait removed from DOM by blocker

        var st = window.getComputedStyle(bait);
        var hidden =
            st.display === 'none' ||
            st.visibility === 'hidden' ||
            st.opacity === '0' ||
            bait.offsetHeight === 0 ||
            bait.offsetParent === null;

        return hidden;
    }

    /* ═══════════════════════════════════════════════════════════════
       LAYER 2 — Ad Script Load Verification
       ═══════════════════════════════════════════════════════════════ */
    function _verifyScriptLoad(onResult) {
        // Use a probe script to verify ad network reachability.
        // We create a throw-away <script> pointing at the ad domain.
        var probe = document.createElement('script');
        var settled = false;
        var timer;

        function _settle(loaded) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            document.head.removeChild(probe);
            _scriptVerified = loaded;
            onResult(!loaded); // blocked = script NOT loaded
        }

        probe.src = _AD_SRC + '?_aab=' + Date.now();
        probe.async = true;
        probe.crossOrigin = 'anonymous';
        probe.onload = function () { _settle(true); };
        probe.onerror = function () { _settle(false); };

        timer = setTimeout(function () { _settle(false); }, _SCRIPT_TIMEOUT);
        document.head.appendChild(probe);
    }

    /* ═══════════════════════════════════════════════════════════════
       LAYER 3 — Ad Container Render Check
       ═══════════════════════════════════════════════════════════════ */
    function _checkContainers() {
        var ids = _SLOT_IDS.filter(function (id, i) { return _SLOT_IDS.indexOf(id) === i; });
        var found = 0;
        var empty = 0;

        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            found++;

            var hasIframe = el.querySelector('iframe') !== null;
            var hasChildren = el.childElementCount > 0;
            var hasDimension = el.clientHeight > 20 || el.scrollHeight > 20;

            if (!hasIframe && (!hasChildren || !hasDimension)) {
                empty++;
            }
        });

        // If we found containers but ALL are empty → probably blocked
        if (found > 0 && empty === found) return true;
        return false;
    }

    /* ═══════════════════════════════════════════════════════════════
       LAYER 4 — Periodic Integrity Recheck
       ═══════════════════════════════════════════════════════════════ */
    function _startPeriodicRecheck() {
        if (_recheckTimer) return;
        _recheckTimer = setInterval(function () {
            var baitFail = _checkBait();
            var containerFail = _checkContainers();

            if (baitFail || containerFail) {
                clearInterval(_recheckTimer);
                _recheckTimer = null;
                _triggerLock();
            }
        }, _RECHECK_INTERVAL);
    }

    /* ═══════════════════════════════════════════════════════════════
       LAYER 5 is the IIFE wrapper itself + the alias/obfuscation
       of internal API and avoidance of any global assignments.
       ═══════════════════════════════════════════════════════════════ */

    /* ─── Overlay Builder ────────────────────────────────────────── */
    function _buildOverlay() {
        if (document.getElementById(_OVERLAY_ID)) return;

        var ov = document.createElement('div');
        ov.id = _OVERLAY_ID;
        ov.setAttribute('role', 'alertdialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Ad blocker detected');

        ov.innerHTML = [
            '<div class="aab-card">',
            '  <div class="aab-icon">🛡️</div>',
            '  <h2 class="aab-title">Ad Blocker Detected</h2>',
            '  <p class="aab-msg">',
            '    Ads help keep this service <strong>free</strong>.',
            '    Please disable your ad blocker, then hit <em>Recheck</em>.',
            '  </p>',
            '  <div class="aab-steps">',
            '    <span>1. Disable your ad&nbsp;blocker</span>',
            '    <span>2. Click <strong>Recheck</strong> below</span>',
            '  </div>',
            '  <div class="aab-actions">',
            '    <button class="aab-btn aab-btn-primary" id="aab-recheck-btn">',
            '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"',
            '           stroke="currentColor" stroke-width="2.5"',
            '           stroke-linecap="round" stroke-linejoin="round">',
            '        <polyline points="23 4 23 10 17 10"/>',
            '        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
            '      </svg>',
            '      Recheck',
            '    </button>',
            '    <button class="aab-btn aab-btn-secondary" id="aab-reload-btn">',
            '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"',
            '           stroke="currentColor" stroke-width="2.5"',
            '           stroke-linecap="round" stroke-linejoin="round">',
            '        <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>',
            '        <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
            '      </svg>',
            '      Reload Page',
            '    </button>',
            '  </div>',
            '  <p class="aab-note" id="aab-status-msg"></p>',
            '</div>',
        ].join('');

        document.body.appendChild(ov);

        document.getElementById('aab-reload-btn').addEventListener('click', function () {
            window.location.reload();
        });

        document.getElementById('aab-recheck-btn').addEventListener('click', _handleRecheck);
    }

    /* ─── Lock / Unlock ──────────────────────────────────────────── */
    function _triggerLock() {
        if (_blocked) return; // already locked
        _blocked = true;

        // Disable generate button if present
        var btn = document.getElementById('generate-btn');
        if (btn) {
            btn.disabled = true;
            btn.setAttribute('data-aab-disabled', '1');
        }

        // Body class for CSS blur + scroll lock
        document.body.classList.add('adblock-detected');

        // Build and show overlay
        _buildOverlay();
        var ov = document.getElementById(_OVERLAY_ID);
        if (ov) {
            ov.style.display = 'flex';
            // Animate in
            requestAnimationFrame(function () {
                ov.classList.add('aab-visible');
            });
        }
    }

    function _triggerUnlock() {
        _blocked = false;

        document.body.classList.remove('adblock-detected');

        var ov = document.getElementById(_OVERLAY_ID);
        if (ov) {
            ov.classList.remove('aab-visible');
            setTimeout(function () {
                ov.style.display = 'none';
            }, 300);
        }

        // Re-enable generate button only if script.js hasn't disabled it
        // for its own reasons (not logged in, no image)
        var btn = document.getElementById('generate-btn');
        if (btn && btn.getAttribute('data-aab-disabled') === '1') {
            btn.removeAttribute('data-aab-disabled');
            // Leave final enabled/disabled state to script.js
        }

        // Restart periodic watch
        if (!_recheckTimer) {
            _startPeriodicRecheck();
        }
    }

    /* ─── Recheck Handler ────────────────────────────────────────── */
    function _handleRecheck() {
        var statusEl = document.getElementById('aab-status-msg');
        var recheckBtn = document.getElementById('aab-recheck-btn');

        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'aab-note'; }
        if (recheckBtn) { recheckBtn.classList.add('aab-spinning'); recheckBtn.disabled = true; }

        // Re-run all detection layers
        setTimeout(function () {
            var baitFail = _checkBait();

            if (baitFail) {
                _finish(true);
                return;
            }

            // Verify script reachability again
            _verifyScriptLoad(function (scriptBlocked) {
                if (scriptBlocked) { _finish(true); return; }

                // Wait a moment for any rendered iframes
                setTimeout(function () {
                    var containerFail = _checkContainers();
                    _finish(containerFail);
                }, 2000);
            });
        }, 500);

        function _finish(stillBlocked) {
            if (recheckBtn) { recheckBtn.classList.remove('aab-spinning'); recheckBtn.disabled = false; }

            if (stillBlocked) {
                if (statusEl) {
                    statusEl.textContent = '⚠ Ad blocker still active. Please fully disable it and reload.';
                    statusEl.classList.add('aab-note-warn');
                }
            } else {
                if (statusEl) {
                    statusEl.textContent = '✓ Ads loaded! Unlocking…';
                    statusEl.classList.add('aab-note-ok');
                }
                setTimeout(_triggerUnlock, 800);
            }
        }
    }

    /* ─── Main Detection Flow ─────────────────────────────────────── */
    function _runDetection() {
        // Layer 1: bait check (immediate)
        var baitFail = _checkBait();
        if (baitFail) {
            _triggerLock();
            return;
        }

        // Layer 2: script load (async, 4 s timeout)
        _verifyScriptLoad(function (scriptBlocked) {
            if (scriptBlocked) {
                _triggerLock();
                return;
            }

            // Layer 3: container render (wait 5 s for iframe injection)
            setTimeout(function () {
                var containerFail = _checkContainers();
                if (containerFail) {
                    _triggerLock();
                    return;
                }

                // All layers passed — start layer 4 periodic watch
                _initialPassed = true;
                _startPeriodicRecheck();
            }, _RENDER_DELAY);
        });
    }

    /* ─── Init ────────────────────────────────────────────────────── */
    function _init() {
        // Inject bait element (moved into body so blocker CSS applies)
        var bait = document.createElement('div');
        bait.id = _BAIT_ID;
        bait.className = 'ads ad adsbox ad-banner sponsor advertisement';
        // Visually zero-sized but technically "present" — blocker collapses or removes it
        bait.style.cssText = [
            'position:absolute',
            'top:-9999px',
            'left:-9999px',
            'width:1px',
            'height:1px',
            'pointer-events:none',
            'opacity:0',
        ].join(';');
        document.body.appendChild(bait);

        // Small delay to let adblocker cosmetic filters run over bait
        setTimeout(_runDetection, 300);
    }

    /* ─── Entry point ─────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
