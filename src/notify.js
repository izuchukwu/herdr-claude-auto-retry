import { execFile } from 'node:child_process';

export function notifyEnv(event, fields = {}) {
  return {
    CLAUDE_AUTO_RETRY_EVENT: event,
    CLAUDE_AUTO_RETRY_PANE: fields.paneId || '',
    CLAUDE_AUTO_RETRY_MESSAGE: String(fields.message || '').slice(0, 300),
    CLAUDE_AUTO_RETRY_RESUME_AT: Number.isFinite(fields.resumeAt) ? new Date(fields.resumeAt).toISOString() : '',
    CLAUDE_AUTO_RETRY_ATTEMPT: fields.attempt == null ? '' : String(fields.attempt),
  };
}

export function runNotify(config, logger, event, fields, exec = execFile) {
  const cmd = config && config.notifyCommand;
  if (!Array.isArray(cmd) || cmd.length === 0) return false;
  try {
    exec(cmd[0], cmd.slice(1), { timeout: 30_000, env: { ...process.env, ...notifyEnv(event, fields) } }, (err) => {
      if (err) logger?.warn(`notify ${event} failed: ${err.message}`);
    });
    return true;
  } catch (err) {
    logger?.warn(`notify ${event} failed: ${err.message}`);
    return false;
  }
}
