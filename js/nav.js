/**
 * nav.js — Injects mobile hamburger toggle for article pages (blog/ and guides/)
 * Include this at the end of <body> on any page that has #hamburger and #mobile-nav
 */
(function() {
    var hamburger = document.getElementById('hamburger');
    var mobileNav = document.getElementById('mobile-nav');
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('open');
            mobileNav.classList.toggle('open');
        });
    }
})();
