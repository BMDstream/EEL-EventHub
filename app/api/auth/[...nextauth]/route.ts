import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextRequest } from "next/server"

const authHandler = NextAuth(authOptions)

const handler = (req: NextRequest, ctx: any) => {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  process.env.NEXTAUTH_URL = `${proto}://${host}`;
  return authHandler(req, ctx);
}

export { handler as GET, handler as POST }
