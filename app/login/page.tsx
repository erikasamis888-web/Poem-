import { isAdminConfigured } from "@/lib/auth";
import { login } from "./actions";

export const metadata = { title: "Admin login" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, next } = await props.searchParams;
  if (!isAdminConfigured()) {
    return (
      <main className="narrow">
        <h1>Admin login</h1>
        <p>
          No admin password is set yet. In Vercel, add an environment variable named{" "}
          <code>ADMIN_PASSWORD</code>, then redeploy.
        </p>
      </main>
    );
  }
  return (
    <main className="narrow">
      <h1>Admin login</h1>
      <form action={login} className="stack">
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/admin"} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoFocus />
        <button type="submit">Log in</button>
        {error && <p className="error">Wrong password. Try again.</p>}
      </form>
    </main>
  );
}
