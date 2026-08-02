// ── HTML Escaping ──

const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => escapeMap[ch]);
}

// ── Toast Notification System ──

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const icons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

export function showToast(message, type = 'info', duration = 4000) {
  const c = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  c.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 300ms ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal System ──

export function showModal({ title, content, actions = [] }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const actionsHtml = actions.map((a, i) =>
      `<button class="btn ${a.class || ''}" data-action="${i}">${a.label}</button>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" data-dismiss>&times;</button>
        </div>
        <div class="modal-body">${content}</div>
        ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
      </div>
    `;

    function close(value = null) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
      resolve(value);
    }

    overlay.querySelector('[data-dismiss]').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    actions.forEach((a, i) => {
      overlay.querySelector(`[data-action="${i}"]`).addEventListener('click', () => {
        close(a.value ?? i);
      });
    });

    document.body.appendChild(overlay);

    // Focus trap — return close function
    overlay._close = close;
  });
}

// ── Status Badge ──

const statusMap = {
  idle: { label: 'Idle', class: 'badge-idle', pulse: false },
  active: { label: 'Active', class: 'badge-active', pulse: true },
  working: { label: 'Working', class: 'badge-working', pulse: true },
  paused: { label: 'Paused', class: 'badge-paused', pulse: false },
  error: { label: 'Error', class: 'badge-error', pulse: true },
  review: { label: 'Review', class: 'badge-review', pulse: true },
  pending: { label: 'Pending', class: 'badge-idle', pulse: false },
  running: { label: 'Running', class: 'badge-working', pulse: true },
  completed: { label: 'Done', class: 'badge-active', pulse: false },
};

export function statusBadge(status) {
  const s = statusMap[status] || statusMap.idle;
  return `<span class="badge ${s.class}"><span class="dot ${s.pulse ? 'pulse' : ''}"></span>${s.label}</span>`;
}

// ── Time Formatting ──

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const now = new Date();
  const past = new Date(dateStr);
  const seconds = Math.floor((now - past) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
