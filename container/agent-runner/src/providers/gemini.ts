import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { log } from '../logger.js';
import { AgentProvider, AgentQuery, ProviderEvent, ProviderOptions, QueryInput } from './types.js';
import { registerProvider } from './provider-registry.js';

export class GeminiProvider implements AgentProvider {
  readonly supportsNativeSlashCommands = false;

  private mcpServers: Record<string, any>;
  private env: Record<string, string | undefined>;

  constructor(options: ProviderOptions = {}) {
    this.mcpServers = options.mcpServers ?? {};
    this.env = { ...process.env, ...(options.env ?? {}) };
  }

  isSessionInvalid(err: unknown): boolean {
    // Gemini CLI session validation logic.
    // If the error message indicates a missing session, return true.
    const msg = err instanceof Error ? err.message : String(err);
    return /session not found/i.test(msg);
  }

  query(input: QueryInput): AgentQuery {
    const cwd = input.cwd;
    
    // Write MCP config to container
    const mcpConfigPath = path.join(cwd, '.mcp.json');
    try {
      fs.writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers: this.mcpServers }));
    } catch (err) {
      log(`Failed to write MCP config: ${err}`);
    }

    let finalPrompt = input.prompt;
    if (input.systemContext?.instructions) {
      finalPrompt = input.prompt + "\\n\\n[Global Context]\\n" + input.systemContext.instructions;
    }

    const args: string[] = [];
    if (input.continuation) {
      args.push('-r', input.continuation);
    }
    
    args.push('-p', finalPrompt);
    args.push('-o', 'stream-json');
    args.push('--approval-mode', 'auto_edit');
    args.push('--allowed-mcp-server-names', Object.keys(this.mcpServers).join(','));

    // Inherit the container's modified PATH with global pnpm bin directory
    const childEnv = { 
      ...this.env, 
      HOME: '/home/node',
      PATH: process.env.PATH + ':/pnpm:/usr/local/bin:/usr/bin' 
    };

    const child = spawn('gemini', args, {
      cwd,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let aborted = false;

    // Stream for incoming push messages (e.g. tool output, IPC messages)
    const pushMessage = (msg: string) => {
      if (!aborted && child.stdin && !child.stdin.destroyed) {
        child.stdin.write(msg + '\\n');
      }
    };

    const events = (async function* () {
      let buffer = '';
      let accumulatedResult = '';

      // Create an async iterator from the readable stream
      for await (const chunk of child.stdout) {
        if (aborted) break;

        buffer += chunk.toString();
        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          yield { type: 'activity' } as ProviderEvent;

          try {
            const msg = JSON.parse(line);
            
            if (msg.type === 'system' && msg.subtype === 'init') {
              yield { type: 'init', continuation: msg.session_id } as ProviderEvent;
            } else if (msg.type === 'message' && msg.role === 'assistant') {
              accumulatedResult += (msg.content || '');
            } else if (msg.type === 'result') {
              const text = (accumulatedResult || '')
                              .replace(/<internal>[\\s\\S]*?<\\/internal>/g, '')
                              .replace(/^\\s*I will[\\s\\S]*?\\.\\s*/gm, '')
                              .trim();
              yield { type: 'result', text: text || null } as ProviderEvent;
              accumulatedResult = ''; // reset for next query
            }
          } catch (e) {
            // Ignore non-JSON lines or parse errors
          }
        }
      }
      
      // Wait for child to exit
      await new Promise<void>((resolve) => {
        child.on('close', resolve);
        child.on('error', resolve);
      });
      
    })();

    // Listen to stderr for logging
    child.stderr.on('data', (data) => log('gemini stderr: ' + data.toString().trim()));

    return {
      push: pushMessage,
      end: () => {
        if (!aborted && child.stdin && !child.stdin.destroyed) {
          child.stdin.end();
        }
      },
      events,
      abort: () => {
        aborted = true;
        child.kill();
      },
    };
  }
}

registerProvider('gemini', (opts) => new GeminiProvider(opts));
