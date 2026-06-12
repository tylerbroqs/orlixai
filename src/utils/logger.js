/**
 * Lightweight terminal logger with Orlix terminal aesthetics.
 * Works without external dependencies via ANSI escape codes.
 */

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  amber:  '\x1b[38;5;215m',
  violet: '\x1b[38;5;183m',
  green:  '\x1b[38;5;114m',
  red:    '\x1b[38;5;203m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
};

function c(code, text) { return `${code}${text}${ANSI.reset}`; }

function timestamp() {
  return c(ANSI.gray, new Date().toISOString().slice(11, 19));
}

function prompt() {
  return `${c(ANSI.green, 'orlix')}${c(ANSI.gray, '@')}${c(ANSI.violet, 'system')}${c(ANSI.gray, ':~$')}`;
}

export const logger = {
  info(msg)    { console.log(`${timestamp()} ${prompt()} ${msg}`); },
  ok(msg)      { console.log(`${timestamp()} ${c(ANSI.green,  '[ok]')}  ${msg}`); },
  warn(msg)    { console.warn(`${timestamp()} ${c(ANSI.amber,  '[!]')}   ${msg}`); },
  error(msg)   { console.error(`${timestamp()} ${c(ANSI.red,   '[err]')} ${msg}`); },
  dim(msg)     { console.log(`${c(ANSI.gray, msg)}`); },
  section(msg) { console.log(`\n${c(ANSI.amber + ANSI.bold, '──')} ${c(ANSI.white, msg)} ${c(ANSI.amber, '──')}`); },

  receipt(r) {
    console.log(`\n${c(ANSI.violet, 'receipt')} ${c(ANSI.gray, r.id)}`);
    const fields = ['intent', 'context', 'policy', 'action', 'approval', 'outcome', 'status'];
    for (const f of fields) {
      if (r[f] !== undefined) {
        console.log(`  ${c(ANSI.violet, f.padEnd(10))} ${r[f]}`);
      }
    }
    if (r.rollback?.available) {
      console.log(`  ${c(ANSI.green, 'rollback')}   available · expires ${r.rollback.expiresAt?.slice(0, 10)}`);
    }
  },

  decision(d) {
    console.log(`\n${c(ANSI.amber, 'decision')}`);
    console.log(`  ${c(ANSI.violet, 'intent  ')} ${d.intent}`);
    console.log(`  ${c(ANSI.violet, 'policy  ')} ${d.policy ?? '-'}`);
    console.log(`  ${c(ANSI.violet, 'action  ')} ${d.action}`);
    console.log(`  ${c(ANSI.violet, 'priority')} ${d.priority ?? 0}`);
  },
};

export default logger;
