"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function MSLoginHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      console.log("MS Token detected, performing silent sign-in...");
      signIn("credentials", {
        token,
        redirect: true,
        callbackUrl: "/admin",
      }).then(() => {
        // Clear the token from URL after processing
        router.replace("/");
      });
    }
  }, [token, router]);

  return null;
}
