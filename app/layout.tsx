import type { Metadata } from "next";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const bricolage = Bricolage_Grotesque({ 
  subsets: ["latin"],
  variable: '--font-bricolage',
});

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "EEL-EventHub | Excellence Entertainment Logistics",
  description: "Professional event management and logistics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${outfit.variable} font-outfit antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
