import type { Receipt, Decision } from '../types/index.js';

const A = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',  dim:    '\x1b[2m',
  amber:  '\x1b[38;5;215m', violet: '\x1b[38;5;183m',
  green:  '\x1b[38;5;114m', red:    '\x1b[38;5;203m', gray: '\x1b[90m',
};

const c = (code: string, text: string): string => `${code}${text}${A.reset}`;
const ts = (): string => c(A.gray, new Date().toISOString().slice(11, 19));
const ps = (): string =>
  `${c(A.green,'orlix')}${c(A.gray,'@')}${c(A.violet,'system')}${c(A.gray,':~$')}`;

export const logger = {
  info(msg: string):    void { console.log(`${ts()} ${ps()} ${msg}`); },
  ok(msg: string):      void { console.log(`${ts()} ${c(A.green,  '[ok]')}  ${msg}`); },
  warn(msg: string):    void { console.warn(`${ts()} ${c(A.amber,  '[!]')}   ${msg}`); },
  error(msg: string):   void { console.error(`${ts()} ${c(A.red,   '[err]')} ${msg}`); },
  dim(msg: string):     void { console.log(c(A.gray, msg)); },
  section(msg: string): void { console.log(`\n${c(A.amber + A.bold,'──')} ${c(A.bold, msg)} ${c(A.amber,'──')}`); },

  receipt(r: Receipt): void {
    console.log(`\n${c(A.violet,'receipt')} ${c(A.gray, r.id)}`);
    const fields = ['intent','context','policy','action','approval','outcome','status'] as const;
    for (const f of fields) {
      const v = r[f as keyof Receipt];
      if (v !== undefined) console.log(`  ${c(A.violet, f.padEnd(10))} ${v as string}`);
    }
    if (r.rollback?.available) {
      console.log(`  ${c(A.green,'rollback')}   available · expires ${r.rollback.expiresAt?.slice(0,10)}`);
    }
  },

  decision(d: Decision): void {
    console.log(`\n${c(A.amber,'decision')}`);
    console.log(`  ${c(A.violet,'intent  ')} ${d.intent}`);
    console.log(`  ${c(A.violet,'policy  ')} ${d.policy ?? '-'}`);
    console.log(`  ${c(A.violet,'action  ')} ${d.action}`);
    console.log(`  ${c(A.violet,'priority')} ${d.priority ?? 0}`);
  },
};

export default logger;
