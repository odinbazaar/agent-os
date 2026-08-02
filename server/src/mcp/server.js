/**
 * MCP Server Setup
 * Registers all Agent OS tools for MCP protocol communication.
 * Uses simulated implementations — real LLM backends can be connected via config.
 */

import { hermesApolloTool } from './tools/hermes-apollo.js';
import { hermesOracleTool } from './tools/hermes-oracle.js';
import { leadGenerationTool } from './tools/lead-generation.js';
import { delegateTool } from './tools/delegate.js';
import { videoAgentTool } from './tools/video-agent.js';

// Collect all MCP tool definitions
export const mcpTools = [
  hermesApolloTool,
  hermesOracleTool,
  leadGenerationTool,
  delegateTool,
  videoAgentTool,
];

/**
 * Get all tool definitions for API exposure
 */
export function getMcpToolDefinitions() {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    inputSchema: tool.inputSchema,
    status: 'simulation',
  }));
}

/**
 * Execute an MCP tool by name
 */
export async function executeMcpTool(toolName, input) {
  const tool = mcpTools.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`MCP Tool not found: ${toolName}`);
  }
  return await tool.execute(input);
}
