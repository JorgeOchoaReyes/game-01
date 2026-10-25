// Only same-site paths are allowed as a post-login destination.
export function safeNext(value: string | string[] | undefined, fallback = "/studio"): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}
