import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "We-Visit",
  description: "Plan and follow venue visits offline",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "We-Visit",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2e2a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-dvh flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
