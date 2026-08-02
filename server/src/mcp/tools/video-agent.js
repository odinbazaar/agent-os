export const videoAgentTool = {
  name: 'video_agent',
  description: 'Video içerik üretimi — senaryo oluşturma, kurgu akışı, en fazla 10 dk. Kısa form için Higsfield optimize.',
  category: 'content',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['script', 'produce', 'review', 'status'], description: 'Workflow action' },
      topic: { type: 'string', description: 'Video topic or brief' },
      duration: { type: 'number', description: 'Target duration in seconds (max 600)', default: 60 },
      format: { type: 'string', enum: ['short-form', 'standard'], default: 'short-form' },
    },
    required: ['action', 'topic'],
  },
  async execute(input) {
    const { action, topic, duration = 60, format = 'short-form' } = input;

    // Enforce 10-minute limit
    const clampedDuration = Math.min(duration, 600);
    const isShortForm = clampedDuration <= 60;

    let result;
    switch (action) {
      case 'script':
        result = {
          phase: 'scripting',
          script: {
            title: `Video: ${topic}`,
            sections: [
              { time: '0:00-0:05', content: 'Hook — attention-grabbing opener' },
              { time: '0:05-0:20', content: 'Problem statement and context' },
              { time: '0:20-0:45', content: 'Solution demonstration' },
              { time: `0:45-${Math.floor(clampedDuration / 60)}:${String(clampedDuration % 60).padStart(2, '0')}`, content: 'CTA and closing' },
            ],
            estimated_duration: `${clampedDuration}s`,
          },
        };
        break;
      case 'produce':
        result = {
          phase: 'production',
          provider: isShortForm ? 'higsfield' : 'manual-workflow',
          note: isShortForm
            ? 'Higsfield optimized for short-form content'
            : 'Long-form content (>60s) uses manual workflow — refer to Boardroom methodology',
          progress: '80%',
          ai_completion: 'AI draft ready — pending human review (80/20 rule)',
        };
        break;
      case 'review':
        result = {
          phase: 'review',
          status: 'awaiting_human_review',
          checklist: ['Visual quality check', 'Audio sync verification', 'Brand alignment', 'CTA effectiveness'],
          note: '20% quality control by human operator required',
        };
        break;
      default:
        result = { phase: 'status', status: 'idle', queue: 0 };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'completed',
          action,
          topic,
          format: isShortForm ? 'short-form' : 'standard',
          duration_limit: `${clampedDuration}s (max 600s)`,
          ...result,
          timestamp: new Date().toISOString(),
        }),
      }],
    };
  },
};
