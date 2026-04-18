/**
 * loader.js — Dynamic content card rendering engine
 * Fetches JSON data and renders cards into target containers.
 */

function loadCards(options) {
  var dataUrl = options.dataUrl;
  var containerId = options.containerId;
  var limit = options.limit;
  var showAll = options.showAll;

  var container = document.getElementById(containerId);
  if (!container) {
    console.warn('[loader.js] Container #' + containerId + ' not found');
    return;
  }

  // Show loading spinner
  container.innerHTML =
    '<div style="text-align:center;padding:3rem;color:var(--text-muted);font-size:0.95rem;">' +
      '<div style="display:inline-block;width:28px;height:28px;border:3px solid rgba(124,58,237,0.2);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:0.5rem;"></div>' +
      'Loading content\u2026' +
    '</div>';

  fetch(dataUrl)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' \u2014 ' + res.statusText);
      return res.json();
    })
    .then(function(items) {
      if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML =
          '<div style="text-align:center;padding:3rem;color:var(--text-muted);">' +
            '<p>No content available yet. Check back soon!</p>' +
          '</div>';
        return;
      }

      var displayItems = showAll ? items : items.slice(0, limit || 4);
      container.innerHTML = '';

      displayItems.forEach(function(item, index) {
        var card = document.createElement('article');
        card.className = 'blog-card glass';
        card.style.animationDelay = (index * 0.08) + 's';

        var icon = item.icon || '\uD83D\uDCC4';
        var title = escapeHtml(item.title || 'Untitled');
        var desc = escapeHtml(item.desc || '');

        // Use URL directly — JSON URLs are already absolute paths from root
        var url = item.url || '#';

        // Store URL on card for click navigation
        card.setAttribute('data-url', url);

        card.innerHTML =
          '<div class="blog-card-icon">' + icon + '</div>' +
          '<div class="blog-card-body">' +
            '<h3>' + title + '</h3>' +
            '<p>' + desc + '</p>' +
            '<span class="btn btn-sm btn-ghost">' +
              'Read More ' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
            '</span>' +
          '</div>';

        // Make entire card clickable
        card.addEventListener('click', function(e) {
          e.stopPropagation();
          var target = card.getAttribute('data-url');
          if (target && target !== '#') {
            window.location.href = target;
          }
        });

        container.appendChild(card);
      });
    })
    .catch(function(err) {
      console.error('[loader.js] Failed to load ' + dataUrl + ':', err);
      container.innerHTML =
        '<div style="text-align:center;padding:3rem;color:var(--error);font-size:0.9rem;">' +
          '<p>\u26A0\uFE0F Failed to load content. Please try again later.</p>' +
        '</div>';
    });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* ─── Auto-initialize on DOM ready ─────────────────────────
   Detect page by container ID — works on any URL structure.
*/
document.addEventListener('DOMContentLoaded', function() {

  if (document.getElementById('guides-grid')) {
    loadCards({ dataUrl: '/data/guides.json', containerId: 'guides-grid', showAll: true });
  }

  if (document.getElementById('blog-grid')) {
    loadCards({ dataUrl: '/data/blog.json', containerId: 'blog-grid', showAll: true });
  }

  if (document.getElementById('home-guides-preview')) {
    loadCards({ dataUrl: '/data/guides.json', containerId: 'home-guides-preview', limit: 4 });
  }

  if (document.getElementById('home-blog-preview')) {
    loadCards({ dataUrl: '/data/blog.json', containerId: 'home-blog-preview', limit: 4 });
  }

});
