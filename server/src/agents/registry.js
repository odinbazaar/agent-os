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
    description: 'Advanced voice assistant and interactive audio interaction layer',
    capabilities: ['voice-input', 'voice-output', 'command-processing', 'tts'],
    defaultConfig: { voice: 'en-US', speed: 1.0, format: 'wav' },
    maxConcurrentTasks: 1,
  },
  'hermes-oracle': {
    name: 'Hermes Oracle',
    icon: '🔮',
    color: '#7c4dff',
    category: 'intelligence',
    description: 'Competitor tracking, market data analysis, and strategic monitoring',
    capabilities: ['competitor-tracking', 'market-analysis', 'serp-comparison', 'trend-detection'],
    defaultConfig: { trackInterval: 3600, maxCompetitors: 20, alertThreshold: 10 },
    maxConcurrentTasks: 3,
  },
  'lead-generation': {
    name: 'Lead Generator',
    icon: '🎯',
    color: '#ff6d00',
    category: 'growth',
    description: 'Automated potential customer detection and listing via APIs',
    capabilities: ['lead-discovery', 'contact-enrichment', 'scoring', 'export'],
    defaultConfig: { sources: ['linkedin', 'crunchbase'], dailyLimit: 100, minScore: 50 },
    maxConcurrentTasks: 2,
  },
  'delegate': {
    name: 'Delegate Manager',
    icon: '🔄',
    color: '#00e676',
    category: 'orchestration',
    description: 'Automatic delegation of complex tasks to sub-agents and workflow management',
    capabilities: ['task-decomposition', 'sub-agent-routing', 'progress-tracking', 'aggregation'],
    defaultConfig: { maxSubAgents: 5, timeout: 300, retryOnFailure: true },
    maxConcurrentTasks: 5,
  },
  'video-agent': {
    name: 'Video Agent',
    icon: '🎬',
    color: '#ff1744',
    category: 'content',
    description: 'Video content production workflow manager (max 10 min, Higsfield optimized)',
    capabilities: ['script-generation', 'video-production', 'editing', 'review-queue'],
    defaultConfig: { maxDuration: 600, format: 'mp4', provider: 'higsfield', quality: '1080p' },
    maxConcurrentTasks: 1,
  },
  'seo-tracker': {
    name: 'SEO Tracker',
    icon: '📊',
    color: '#ffab00',
    category: 'analytics',
    description: 'Rank tracking and SEO reporting via DataForSEO API integration',
    capabilities: ['rank-tracking', 'serp-analysis', 'keyword-monitoring', 'reporting'],
    defaultConfig: { checkInterval: 86400, engine: 'google', maxKeywords: 500 },
    maxConcurrentTasks: 2,
  },
  'custom': {
    name: 'Custom Agent',
    icon: '⚙️',
    color: '#78909c',
    category: 'custom',
    description: 'User-defined custom agent with configurable capabilities',
    capabilities: [],
    defaultConfig: {},
    maxConcurrentTasks: 1,
  },
};

export const AGENT_STATUSES = {
  idle: { label: 'Idle', color: '#78909c', glow: false },
  active: { label: 'Active', color: '#00e676', glow: true },
  working: { label: 'Working', color: '#00e5ff', glow: true },
  paused: { label: 'Paused', color: '#ffab00', glow: false },
  error: { label: 'Error', color: '#ff1744', glow: true },
  review: { label: 'Needs Review', color: '#7c4dff', glow: true },
};

export const AGENT_CATEGORIES = {
  interaction: { label: 'Interaction', icon: '💬' },
  intelligence: { label: 'Intelligence', icon: '🧠' },
  growth: { label: 'Growth', icon: '📈' },
  orchestration: { label: 'Orchestration', icon: '🔗' },
  content: { label: 'Content', icon: '🎨' },
  analytics: { label: 'Analytics', icon: '📊' },
  custom: { label: 'Custom', icon: '⚙️' },
};

export function getAgentType(type) {
  return AGENT_TYPES[type] || AGENT_TYPES['custom'];
}

export function getAllTypes() {
  return Object.entries(AGENT_TYPES).map(([key, val]) => ({ id: key, ...val }));
}
