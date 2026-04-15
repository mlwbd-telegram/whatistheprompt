/**
 * loader.js — Dynamic content card rendering engine
 *
 * Fetches JSON data and renders cards into target containers.
 * Used on homepage previews, /guides.html, and /blog.html.
 *
 * Usage:
 *   loadCards({
 *     dataUrl: '/data/guides.json',
 *     containerId: 'guides-grid',
 *     limit: 4
 *   });
 */

function loadCards(options) {
  const { dataUrl, containerId, limit, showAll } = options;
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`[loader.js] Container #${containerId} not found`);
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="loading-state" style="text-align:center; padding:3rem; color:var(--text-muted); font-size:0.95rem;">
      <div class="loading-spinner" style="display:inline-block; width:28px; height:28px; border:3px solid rgba(124,58,237,0.2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; vertical-align:middle; margin-right:0.5rem;"></div>
      Loading content…
    </div>
  `;

  fetch(dataUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      return res.json();
    })
    .then((items) => {
      if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="text-align:center; padding:3rem; color:var(--text-muted);">
            <p>No content available yet. Check back soon!</p>
          </div>
        `;
        return;
      }

      const displayItems = showAll ? items : items.slice(0, limit || 4);

      container.innerHTML = '';

      displayItems.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'blog-card glass';
        card.style.animationDelay = `${index * 0.08}s`;

        const icon = item.icon || '📄';
        const title = escapeHtml(item.title || 'Untitled');
        const desc = escapeHtml(item.desc || '');
        const url = item.url || '#';

        card.innerHTML = `
          <div class="blog-card-icon">${icon}</div>
          <div class="blog-card-body">
            <h3>${title}</h3>
            <p>${desc}</p>
            <a href="${url}" class="btn btn-sm btn-ghost">
              Read More
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch((err) => {
      console.error(`[loader.js] Failed to load ${dataUrl}:`, err);
      container.innerHTML = `
        <div class="error-state" style="text-align:center; padding:3rem; color:var(--error); font-size:0.9rem;">
          <p>⚠️ Failed to load content. Please try again later.</p>
        </div>
      `;
    });
}

/**
 * Escape HTML to prevent XSS when inserting dynamic content
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* ─── Auto-initialize on DOM ready ───────────────────────────
   Detects page context and loads appropriate content.
*/
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // /guides.html — load all guides
  if (path.includes('guides.html')) {
    loadCards({
      dataUrl: 'data/guides.json',
      containerId: 'guides-grid',
      showAll: true,
    });
  }

  // /blog.html — load all blog posts
  if (path.includes('blog.html')) {
    loadCards({
      dataUrl: 'data/blog.json',
      containerId: 'blog-grid',
      showAll: true,
    });
  }

  // Homepage — load preview cards (3–4 each)
  if (path.endsWith('/') || path.includes('index.html')) {
    // Guides preview on homepage
    if (document.getElementById('home-guides-preview')) {
      loadCards({
        dataUrl: 'data/guides.json',
        containerId: 'home-guides-preview',
        limit: 4,
      });
    }

    // Blog preview on homepage
    if (document.getElementById('home-blog-preview')) {
      loadCards({
        dataUrl: 'data/blog.json',
        containerId: 'home-blog-preview',
        limit: 4,
      });
    }
  }
});
