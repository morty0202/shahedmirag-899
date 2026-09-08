/**
 * Active API adapter.
 *
 * The app talks to the real Express backend (server/server.mjs) through the
 * REST adapters; nothing depends on the mock anymore. Each screen uses the
 * AuthApi contract, so switching implementations stays trivial.
 */
import { restApi } from "./restApi";
import type { AuthApi } from "./types";

export const api: AuthApi = restApi;

export * from "./types";
