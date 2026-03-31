import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Call backend API to authenticate and fetch real admin user data
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password
            })
          });
          if (!res.ok) return null;
          const user = await res.json();
          // Adjust this mapping based on your backend's response structure
          if (user && user.data) {
            return {
              id: user.data.id || user.data.user_id || user.data._id || user.data.email,
              name: user.data.first_name || user.data.firstName || user.data.name || user.data.full_name || user.data.fullName,
              email: user.data.email,
              // Add any other fields you want in the session here
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin"
  }
});
