export async function checkAppVersion(currentVersion: string, signal?: AbortSignal) {
  const response = await fetch("/api/app-version", { cache: "no-store", signal });
  if (!response.ok) throw new Error("The update check failed.");
  const result = await response.json();
  if (typeof result.version !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(result.version)) {
    throw new Error("The update response was invalid.");
  }
  return {
    version: result.version as string,
    available: currentVersion !== "development" && result.version !== "development" && result.version !== currentVersion,
  };
}
