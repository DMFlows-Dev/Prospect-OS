export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export function fail(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}
