import { cleanDeadSessions } from "../session.js";
import type { Options } from "../flags.js";

export function clean(_args: string[], _options: Options) {
  const cleaned = cleanDeadSessions();
  if (cleaned.length === 0) {
    console.log("nothing to clean");
  } else {
    console.log(JSON.stringify({ cleaned }));
  }
}
