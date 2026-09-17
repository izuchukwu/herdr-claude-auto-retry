import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyEnv, runNotify } from '../src/notify.js';
import { loadConfig } from '../src/config.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('no notifyCommand means nothing runs', () => {
  let ran = false;
  assert.equal(runNotify({ notifyCommand: [] }, null, 'limit', {}, () => { ran = true; }), false);
  assert.equal(ran, false);
});

test('notifyCommand runs as argv with the event in the environment', () => {
  const calls = [];
  const ok = runNotify({ notifyCommand: ['/usr/bin/true', '--x'] }, null, 'limit',
    { paneId: 'w1:p1', message: 'resets 6pm', resumeAt: Date.parse('2026-09-17T01:01:00Z') },
    (file, args, opts) => calls.push([file, args, opts.env]));
  assert.equal(ok, true);
  assert.equal(calls[0][0], '/usr/bin/true');
  assert.deepEqual(calls[0][1], ['--x']);
  assert.equal(calls[0][2].CLAUDE_AUTO_RETRY_EVENT, 'limit');
  assert.equal(calls[0][2].CLAUDE_AUTO_RETRY_PANE, 'w1:p1');
  assert.equal(calls[0][2].CLAUDE_AUTO_RETRY_RESUME_AT, '2026-09-17T01:01:00.000Z');
});

test('a throwing notify never propagates', () => {
  const warned = [];
  const ok = runNotify({ notifyCommand: ['x'] }, { warn: (m) => warned.push(m) }, 'resumed', {}, () => { throw new Error('boom'); });
  assert.equal(ok, false);
  assert.match(warned[0], /boom/);
});

test('notifyEnv leaves unknown fields empty', () => {
  assert.deepEqual(notifyEnv('cleared'), {
    CLAUDE_AUTO_RETRY_EVENT: 'cleared', CLAUDE_AUTO_RETRY_PANE: '', CLAUDE_AUTO_RETRY_MESSAGE: '',
    CLAUDE_AUTO_RETRY_RESUME_AT: '', CLAUDE_AUTO_RETRY_ATTEMPT: '',
  });
});

test('config keeps a valid notifyCommand and drops an invalid one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'car-notify-'));
  const good = join(dir, 'good.json');
  writeFileSync(good, JSON.stringify({ notifyCommand: ['/usr/bin/python3', '/opt/x.py'] }));
  assert.deepEqual(loadConfig(good).notifyCommand, ['/usr/bin/python3', '/opt/x.py']);
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ notifyCommand: 'rm -rf /' }));
  assert.deepEqual(loadConfig(bad).notifyCommand, []);
});
