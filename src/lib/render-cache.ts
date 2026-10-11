import { cache } from "react";

// Next's server renderer provides request-scoped React caching. Plain React 18
// in scripts/API runtimes has no cache export, so keep those calls uncached.
export const cacheForRender: typeof cache = typeof cache === "function" ? cache : (fn) => fn;
