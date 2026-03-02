import { getCsrfToken } from "next-auth/react";
import React from "react";

export default function SignIn({ csrfToken }: { csrfToken: string }) {
  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 24 }}>Sign In</h2>
      <form method="post" action="/api/auth/callback/credentials">
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
        <div style={{ marginBottom: 16 }}>
          <label>Username</label>
          <input name="username" type="text" style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input name="password" type="password" style={{ width: "100%", padding: 8 }} />
        </div>
        <button type="submit" style={{ width: "100%", padding: 10, background: "#059669", color: "#fff", border: "none", borderRadius: 4 }}>Sign in</button>
      </form>
    </div>
  );
}

SignIn.getInitialProps = async (context: any) => {
  return {
    csrfToken: await getCsrfToken(context)
  };
};
