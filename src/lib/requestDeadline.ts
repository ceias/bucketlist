export const SAVE_TIMEOUT_MS = 15_000;

/** Bound the entire request, including authentication/token waits, and abort its fetch on timeout. */
export async function withRequestDeadline<T>(request: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = SAVE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Supabase did not respond within ${Math.round(timeoutMs / 1000)} seconds. Check your connection and try again. If this continues, refresh the app and sign in again.`));
    }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => request(controller.signal)), deadline]); }
  finally { clearTimeout(timer); }
}
