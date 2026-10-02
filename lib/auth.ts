import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, isAdminConfigured } from "./admin-token";

export { ADMIN_COOKIE, adminToken, isAdminConfigured };

export async function isAdmin() {
  if (!isAdminConfigured()) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === (await adminToken());
}

// Server actions run as their own requests, so each one checks this too.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
