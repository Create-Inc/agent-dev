export interface Options {
  session: string | null;
  portless: boolean;
  all: boolean;
  attach: boolean;
  env: Record<string, string>;
}

function parseEnvPairs(pairs?: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  if (!pairs) return env;
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) {
      env[pair] = process.env[pair] ?? "";
    } else {
      env[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  }
  return env;
}

export function toOptions(argv: { session?: string; portless?: boolean; all?: boolean; attach?: boolean; env?: string[] }): Options {
  return {
    session: argv.session ?? process.env.AGENT_DEV_SESSION ?? null,
    portless: argv.portless ?? process.env.AGENT_DEV_PORTLESS === "1",
    all: argv.all ?? false,
    attach: argv.attach ?? false,
    env: parseEnvPairs(argv.env),
  };
}
