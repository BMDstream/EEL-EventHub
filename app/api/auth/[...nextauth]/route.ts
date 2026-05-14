import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email === "admin@eel-eventhub.com" && credentials?.password === "EEL-Admin-2026!") {
          return { id: "1", name: "Super Admin", email: "admin@eel-eventhub.com", role: "admin" }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      
      // If role is missing (e.g. Azure AD login), try to fetch from DB
      if (!token.role && token.email) {
        try {
          const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/py/users`);
          if (res.ok) {
            const users = await res.json();
            const dbUser = users.find((u: any) => u.email === token.email);
            if (dbUser) {
              token.role = dbUser.role;
            }
          }
        } catch (err) {
          console.error("Failed to fetch user role from DB", err);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role || "staff";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
})

export { handler as GET, handler as POST }
