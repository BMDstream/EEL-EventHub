
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        // If a token is provided (from Microsoft login redirect)
        if (credentials?.token) {
          try {
            // Use the base URL from env
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const res = await fetch(`${baseUrl}/api/py/auth/verify?token=${credentials.token}`);
            
            if (res.ok) {
              const user = await res.json();
              return { 
                id: user.sub, 
                email: user.email, 
                role: user.role 
              };
            }
          } catch (err) {
            console.error("Token verification error:", err);
          }
          return null;
        }

        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const password = credentials.password;

        // 1. Primary check: Query the database directly
        try {
          // Import DB dynamically to avoid issues with edge runtime if needed
          const { default: sql } = await import("@/lib/db");
          
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

        // 2. Secondary fallback: Hardcoded accounts
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
      
      if (!token.role && token.email) {
        try {
          // Use the internal API or DB to get the role
          const { default: sql } = await import("@/lib/db");
          const results = await sql`
            SELECT role FROM "user" WHERE LOWER(email) = ${token.email.toLowerCase()} LIMIT 1
          `;
          if (results && results.length > 0) {
            token.role = results[0].role;
          }
        } catch (err) {
          console.error("Failed to fetch user role from DB in JWT callback", err);
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
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  debug: true,
};

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("WARNING: NEXTAUTH_SECRET is not set. This will cause configuration errors in production.");
}

