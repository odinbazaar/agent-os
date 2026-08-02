/**
 * Agent Type Registry
 * Defines all available agent types, their capabilities, and metadata.
 */

export const AGENT_TYPES = {
  'hermes-apollo': {
    name: 'Hermes Apollo',
    icon: '🎙️',
    color: '#00e5ff',
    category: 'interaction',
    description: 'Gelişmiş sesli asistan ve etkileşimli ses katmanı',
    capabilities: ['voice-input', 'voice-output', 'command-processing', 'tts'],
    defaultConfig: { voice: 'en-US', speed: 1.0, format: 'wav' },
    maxConcurrentTasks: 1,
  },
  'hermes-oracle': {
    name: 'Hermes Oracle',
    icon: '🔮',
    color: '#7c4dff',
    category: 'intelligence',
    description: 'Rakip takibi, pazar verisi analizi ve stratejik izleme',
    capabilities: ['competitor-tracking', 'market-analysis', 'serp-comparison', 'trend-detection'],
    defaultConfig: { trackInterval: 3600, maxCompetitors: 20, alertThreshold: 10 },
    maxConcurrentTasks: 3,
  },
  'lead-generation': {
    name: 'Lead Generator',
    icon: '🎯',
    color: '#ff6d00',
    category: 'growth',
    description: 'API tabanlı otomatik potansiyel müşteri tespiti ve listeleme',
    capabilities: ['lead-discovery', 'contact-enrichment', 'scoring', 'export'],
    defaultConfig: { sources: ['linkedin', 'crunchbase'], dailyLimit: 100, minScore: 50 },
    maxConcurrentTasks: 2,
  },
  'delegate': {
    name: 'Delegate Manager',
    icon: '🔄',
    color: '#00e676',
    category: 'orchestration',
    description: 'Karmaşık görevlerin alt ajanlara otomatik dağıtımı ve iş akışı yönetimi',
    capabilities: ['task-decomposition', 'sub-agent-routing', 'progress-tracking', 'aggregation'],
    defaultConfig: { maxSubAgents: 5, timeout: 300, retryOnFailure: true },
    maxConcurrentTasks: 5,
  },
  'video-agent': {
    name: 'Video Agent',
    icon: '🎬',
    color: '#ff1744',
    category: 'content',
    description: 'Video içerik üretim akışı yöneticisi (en fazla 10 dk, Higsfield optimize)',
    capabilities: ['script-generation', 'video-production', 'editing', 'review-queue'],
    defaultConfig: { maxDuration: 600, format: 'mp4', provider: 'higsfield', quality: '1080p' },
    maxConcurrentTasks: 1,
  },
  'seo-tracker': {
    name: 'SEO Tracker',
    icon: '📊',
    color: '#ffab00',
    category: 'analytics',
    description: 'DataForSEO API entegrasyonu ile sıra takibi ve SEO raporlama',
    capabilities: ['rank-tracking', 'serp-analysis', 'keyword-monitoring', 'reporting'],
    defaultConfig: { checkInterval: 86400, engine: 'google', maxKeywords: 500 },
    maxConcurrentTasks: 2,
  },
  'custom': {
    name: 'Özel Ajan',
    icon: '⚙️',
    color: '#78909c',
    category: 'custom',
    description: 'Yapılandırılabilir yeteneklere sahip, kullanıcı tanımlı ajan',
    capabilities: [],
    defaultConfig: {},
    maxConcurrentTasks: 1,
  },
};

export const AGENT_STATUSES = {
  idle: { label: 'Boşta', color: '#78909c', glow: false },
  active: { label: 'Aktif', color: '#00e676', glow: true },
  working: { label: 'Çalışıyor', color: '#00e5ff', glow: true },
  paused: { label: 'Duraklatıldı', color: '#ffab00', glow: false },
  error: { label: 'Hata', color: '#ff1744', glow: true },
  review: { label: 'İnceleme Gerekli', color: '#7c4dff', glow: true },
};

export const AGENT_CATEGORIES = {
  interaction: { label: 'Etkileşim', icon: '💬' },
  intelligence: { label: 'İstihbarat', icon: '🧠' },
  growth: { label: 'Büyüme', icon: '📈' },
  orchestration: { label: 'Orkestrasyon', icon: '🔗' },
  content: { label: 'İçerik', icon: '🎨' },
  analytics: { label: 'Analitik', icon: '📊' },
  custom: { label: 'Özel', icon: '⚙️' },
};

export function getAgentType(type) {
  return AGENT_TYPES[type] || AGENT_TYPES['custom'];
}

export function getAllTypes() {
  return Object.entries(AGENT_TYPES).map(([key, val]) => ({ id: key, ...val }));
}
