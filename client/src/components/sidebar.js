import { navigate } from '../router.js';
import { ws } from '../websocket.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="logo">🤖</div>
      <div class="brand-text">
        <div class="brand-name">Agent OS</div>
        <div class="brand-version">v1.0.0 · Jarvis</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">Overview</div>
      <a class="nav-item active" data-route="/" id="nav-dashboard">
        <span class="icon">📊</span>
        <span class="label">Dashboard</span>
      </a>
      
      <div class="sidebar-section-label">Management</div>
      <a class="nav-item" data-route="/agents" id="nav-agents">
        <span class="icon">🤖</span>
        <span class="label">Agents</span>
        <span class="nav-badge" id="agent-count" style="display:none">0</span>
      </a>
      <a class="nav-item" data-route="/seo" id="nav-seo">
        <span class="icon">📈</span>
        <span class="label">SEO Tracker</span>
      </a>
      <a class="nav-item" data-route="/video" id="nav-video">
        <span class="icon">🎬</span>
        <span class="label">Video Agent</span>
      </a>
      
      <div class="sidebar-section-label">System</div>
      <a class="nav-item" data-route="/workspace" id="nav-workspace">
        <span class="icon">🔀</span>
        <span class="label">Workspace</span>
      </a>
      <a class="nav-item" data-route="/settings" id="nav-settings">
        <span class="icon">⚙️</span>
        <span class="label">Settings</span>
      </a>
    </nav>
    <div class="sidebar-footer">
      <button class="sidebar-toggle" id="sidebar-toggle">
        <span>◀</span>
        <span class="label">Collapse</span>
      </button>
    </div>
  `;

  // Navigation clicks
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.route);
    });
  });

  // Toggle collapse
  sidebar.querySelector('#sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const btn = sidebar.querySelector('#sidebar-toggle span:first-child');
    btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
  });

  return sidebar;
}

export function renderHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="header-left">
      <div class="header-breadcrumb">
        Agent OS / <span>Dashboard</span>
      </div>
    </div>
    <div class="header-right">
      <div class="header-search">
        <span class="search-icon">🔍</span>
        <input type="text" class="input" placeholder="Search agents, tasks..." id="global-search" />
      </div>
      <div class="ws-indicator disconnected" id="ws-status">
        <span class="dot"></span>
        <span class="label">Offline</span>
      </div>
    </div>
  `;

  // Update WebSocket status indicator
  ws.on('connection', ({ connected }) => {
    const indicator = document.getElementById('ws-status');
    if (!indicator) return;
    indicator.className = `ws-indicator ${connected ? 'connected' : 'disconnected'}`;
    indicator.querySelector('.label').textContent = connected ? 'Live' : 'Offline';
  });

  return header;
}
