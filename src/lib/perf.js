// src/lib/perf.js
// Tiny DEV-only performance logger.
// No behavior changes. Safe to ship, but logs only in dev.

const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

function now() {
  // performance.now() is better if available
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

export async function perfTime(label, fn) {
  if (!isDev) return await fn();

  const t0 = now();
  try {
    const res = await fn();
    const t1 = now();
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label} ${Math.round(t1 - t0)}ms`);
    return res;
  } catch (e) {
    const t1 = now();
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label} ${Math.round(t1 - t0)}ms (error)`);
    throw e;
  }
}

export function perfLog(label, extra) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}`, extra ?? "");
}
