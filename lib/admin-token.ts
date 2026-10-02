// Shared by the login page and proxy.ts (which can't use next/headers).
export const ADMIN_COOKIE = "poem_admin";

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// The cookie stores a hash of the password, never the password itself.
// Changing ADMIN_PASSWORD logs everyone out.
export async function adminToken(): Promise<string> {
  const data = new TextEncoder().encode(
    `community-poems:${process.env.ADMIN_PASSWORD ?? ""}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
