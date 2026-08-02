const routes = {};
let currentRoute = null;
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export async function navigate(path) {
  if (currentRoute === path) return;

  // Cleanup previous page
  if (currentCleanup) {
    try { currentCleanup(); } catch (e) {}
    currentCleanup = null;
  }

  currentRoute = path;
  window.history.pushState({}, '', `#${path}`);

  const content = document.getElementById('page-content');
  if (!content) return;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === path);
  });

  // Update breadcrumb
  const breadcrumb = document.querySelector('.header-breadcrumb span');
  if (breadcrumb) {
    const names = {
      '/': 'Dashboard',
      '/agents': 'Agents',
      '/seo': 'SEO Tracker',
      '/video': 'Video Agent',
      '/workspace': 'Workspace',
      '/settings': 'Settings',
    };
    breadcrumb.textContent = names[path] || path;
  }

  const handler = routes[path] || routes['/'];
  if (handler) {
    content.innerHTML = '<div class="flex items-center justify-center" style="height:200px"><div class="spinner"></div></div>';
    try {
      const cleanup = await handler(content);
      if (typeof cleanup === 'function') {
        currentCleanup = cleanup;
      }
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Error loading page: ${e.message}</p></div>`;
    }
  }
}

export function getCurrentRoute() {
  return currentRoute;
}

export function initRouter() {
  const hash = window.location.hash.slice(1) || '/';
  navigate(hash);

  window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1) || '/';
    currentRoute = null; // Force re-render
    navigate(hash);
  });
}
