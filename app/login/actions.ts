"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, adminToken, isAdminConfigured } from "@/lib/auth";

function samePassword(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const safeNext = next.startsWith("/admin") ? next : "/admin";

  if (!isAdminConfigured() || !samePassword(password, process.env.ADMIN_PASSWORD!)) {
    redirect(`/login?error=1&next=${encodeURIComponent(safeNext)}`);
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(safeNext);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/login");
}
