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
      name: "Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const password = credentials.password;

        // 1. Primary check: Query the database directly (Native & Reliable)
        try {
          const { default: sql } = await import("@/lib/db");
          // Use the "user" table (quoted because it's a reserved keyword in Postgres)
          const results = await sql`
            SELECT id, email, password, role FROM "user" 
            WHERE LOWER(email) = ${email} AND password = ${password}
            LIMIT 1
          `;

          if (results && results.length > 0) {
            const user = results[0];
            return { 
              id: user.id.toString(), 
              email: user.email, 
              role: user.role 
            };
          }
        } catch (dbErr) {
          console.error("Direct DB Auth Error:", dbErr);
        }

        // 2. Secondary fallback: Hardcoded accounts (Emergency access)
        const hardcodedUsers = [
          { email: "barton@bmdcomputing.com", password: "EEL-Admin-2026!", role: "admin" },
          { email: "alareez@eelogistics.co.za", password: "EEL-Manager-2026!", role: "manager" },
          { email: "lysander@eelogistics.co.za", password: "EEL-Staff-2026!", role: "staff" }
        ];

        const matchingHardcoded = hardcodedUsers.find(u => u.email === email && u.password === password);
        if (matchingHardcoded) {
          return { id: matchingHardcoded.email, email: matchingHardcoded.email, role: matchingHardcoded.role };
        }
        
        return null;
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
