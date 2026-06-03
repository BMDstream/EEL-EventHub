
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
                role: user.role,
                allowed_clients: user.allowed_clients || [],
                client_roles: user.client_roles || []
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
            SELECT u.id, u.email, u.password, u.role, 
                   ARRAY_AGG(c.slug) FILTER (WHERE c.slug IS NOT NULL) as allowed_clients,
                   ARRAY_AGG(l.role) FILTER (WHERE l.role IS NOT NULL) as client_roles
            FROM "user" u
            LEFT JOIN userclientlink l ON l.user_id = u.id
            LEFT JOIN client c ON c.id = l.client_id
            WHERE LOWER(u.email) = ${email}
            GROUP BY u.id
            LIMIT 1
          `;

          if (results && results.length > 0) {
            const user = results[0];
            let isMatch = false;

            if (user.password) {
              const bcrypt = await import("bcryptjs");
              // Check if it's a bcrypt hash
              if (
                user.password.startsWith("$2a$") ||
                user.password.startsWith("$2b$") ||
                user.password.startsWith("$2y$")
              ) {
                isMatch = await bcrypt.compare(password, user.password);
              } else {
                // Fallback to plain-text check for legacy passwords
                isMatch = user.password === password;
                if (isMatch) {
                  // Migrate legacy plain-text password to bcrypt hash on the fly
                  try {
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);
                    await sql`
                      UPDATE "user"
                      SET password = ${hashedPassword}
                      WHERE id = ${user.id}
                    `;
                    console.log(`Successfully migrated password to bcrypt hash for user: ${email}`);
                  } catch (migrationErr) {
                    console.error("Failed to migrate legacy password to bcrypt hash:", migrationErr);
                  }
                }
              }
            }

            if (isMatch) {
              return { 
                id: user.id.toString(), 
                email: user.email, 
                role: user.role,
                allowed_clients: user.allowed_clients || [],
                client_roles: user.client_roles || []
              };
            }
          }
        } catch (dbErr) {
          console.error("Direct DB Auth Error:", dbErr);
        }

        // 2. No hardcoded fallback — all users must exist in the database.
        // To add a user: insert them via /admin/users or the seed script.
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Only query the DB on initial sign-in (when `user` is present).
      // Subsequent requests reuse the token — no extra DB hit per request.
      if (user) {
        token.role = (user as any).role;
        token.allowed_clients = (user as any).allowed_clients || [];
        token.client_roles = (user as any).client_roles || [];

        // Refresh from DB on first sign-in to get the latest role/clients
        if (token.email) {
          try {
            const { default: sql } = await import("@/lib/db");
            const results = await sql`
              SELECT u.role, 
                     ARRAY_AGG(c.slug) FILTER (WHERE c.slug IS NOT NULL) as allowed_clients,
                     ARRAY_AGG(l.role) FILTER (WHERE l.role IS NOT NULL) as client_roles
              FROM "user" u
              LEFT JOIN userclientlink l ON l.user_id = u.id
              LEFT JOIN client c ON c.id = l.client_id
              WHERE LOWER(u.email) = ${token.email.toLowerCase()}
              GROUP BY u.id
              LIMIT 1
            `;
            if (results && results.length > 0) {
              token.role = results[0].role;
              token.allowed_clients = results[0].allowed_clients || [];
              token.client_roles = results[0].client_roles || [];
            }
          } catch (err) {
            console.error("Failed to fetch user role from DB in JWT callback", err);
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role || "staff";
        (session.user as any).allowed_clients = token.allowed_clients || [];
        (session.user as any).client_roles = (token as any).client_roles || [];
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
  debug: process.env.NODE_ENV !== "production",
};

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("WARNING: NEXTAUTH_SECRET is not set. This will cause configuration errors in production.");
}

