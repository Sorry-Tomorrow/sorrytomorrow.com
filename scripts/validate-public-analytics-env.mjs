import { pathToFileURL } from "node:url";
import { publicProjectToken } from "../app/analytics-policy.mjs";

export function validatePublicAnalyticsEnv(env) {
  const value = env.NEXT_PUBLIC_POSTHOG_KEY;
  if (value !== undefined && value !== "" && !publicProjectToken(value)) {
    throw new Error("NEXT_PUBLIC_POSTHOG_KEY must be a public phc_ ingestion token. Never use a personal/admin key in a public build setting.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { validatePublicAnalyticsEnv(process.env); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
