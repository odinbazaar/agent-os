import { config } from '../config.js';

const TAILSCALE_API = 'https://api.tailscale.com/api/v2';

async function tsRequest(endpoint) {
  if (!config.tailscale.hasCredentials) {
    return { mock: true, message: 'Tailscale credentials not configured' };
  }

  const res = await fetch(`${TAILSCALE_API}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${config.tailscale.apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

export async function getDevices() {
  if (!config.tailscale.hasCredentials) {
    return {
      mock: true,
      devices: [
        { id: 'dev-001', hostname: 'jarvis-workstation', os: 'Windows', online: true, ip: '100.x.x.1', lastSeen: new Date().toISOString() },
        { id: 'dev-002', hostname: 'mobile-iphone', os: 'iOS', online: true, ip: '100.x.x.2', lastSeen: new Date().toISOString() },
        { id: 'dev-003', hostname: 'cloud-server', os: 'Linux', online: false, ip: '100.x.x.3', lastSeen: new Date(Date.now() - 3600000).toISOString() },
      ],
    };
  }

  return tsRequest(`/tailnet/${config.tailscale.tailnet}/devices`);
}

export async function getNetworkStatus() {
  if (!config.tailscale.hasCredentials) {
    return {
      mock: true,
      status: 'connected',
      tailnet: 'demo-tailnet',
      connectedDevices: 2,
      totalDevices: 3,
      securityNote: 'Tailscale yerel dosya erişimi sağlar. Erişimi sınırlamak için ACL yapılandırın.',
    };
  }

  const devices = await tsRequest(`/tailnet/${config.tailscale.tailnet}/devices`);
  const deviceList = devices.devices || [];
  return {
    status: 'connected',
    tailnet: config.tailscale.tailnet,
    connectedDevices: deviceList.filter(d => d.online).length,
    totalDevices: deviceList.length,
    securityNote: 'Tailscale enables local file access. Configure ACLs to restrict access.',
  };
}
