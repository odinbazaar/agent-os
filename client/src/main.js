import './styles/index.css';
import './styles/dashboard.css';
import './styles/agents.css';
import './styles/seo.css';

import { renderSidebar, renderHeader } from './components/sidebar.js';
import { registerRoute, initRouter } from './router.js';
import { ws } from './websocket.js';

// Import pages
import { renderDashboard } from './pages/dashboard.js';
import { renderAgents } from './pages/agents.js';
import { renderSeoTracker } from './pages/seo-tracker.js';
import { renderVideoAgent } from './pages/video-agent.js';
import { renderWorkspace } from './pages/workspace.js';
import { renderSettings } from './pages/settings.js';

// Boot Agent OS
function init() {
  const app = document.getElementById('app');

  // Clear the boot screen before mounting the shell
  app.innerHTML = '';

  // Render shell
  const sidebar = renderSidebar();
  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';

  const header = renderHeader();
  const pageContent = document.createElement('div');
  pageContent.className = 'page-content';
  pageContent.id = 'page-content';

  mainContent.appendChild(header);
  mainContent.appendChild(pageContent);

  app.appendChild(sidebar);
  app.appendChild(mainContent);

  // Register routes
  registerRoute('/', renderDashboard);
  registerRoute('/agents', renderAgents);
  registerRoute('/seo', renderSeoTracker);
  registerRoute('/video', renderVideoAgent);
  registerRoute('/workspace', renderWorkspace);
  registerRoute('/settings', renderSettings);

  // Connect WebSocket
  ws.connect();

  // Initialize router
  initRouter();

  console.log(
    '%c🤖 Agent OS v1.0.0 %c Loaded',
    'background:linear-gradient(135deg,#00e5ff,#7c4dff);color:#000;padding:4px 8px;border-radius:4px;font-weight:bold',
    'color:#8b8fa3'
  );
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
