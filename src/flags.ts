export interface Options {
  session: string | null;
  portless: boolean;
  all: boolean;
}

export function toOptions(argv: { session?: string; portless?: boolean; all?: boolean }): Options {
  return {
    session: argv.session ?? process.env.AGENT_DEV_SESSION ?? null,
    portless: argv.portless ?? process.env.AGENT_DEV_PORTLESS === "1",
    all: argv.all ?? false,
  };
}
