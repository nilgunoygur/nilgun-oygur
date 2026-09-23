/** Keep pg's current certificate and hostname verification explicit across pg major versions. */
export function verifiedDatabaseUrl(value: string): string {
  if (!value) return value;
  const url = new URL(value);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
