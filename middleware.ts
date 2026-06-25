import { withAuth } from "next-auth/middleware"

export default function middleware(req: any, event: any) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }
  return withAuth({
    secret: process.env.NEXTAUTH_SECRET,
  })(req, event);
}

export const config = { 
  matcher: ["/admin/:path*"] 
}
