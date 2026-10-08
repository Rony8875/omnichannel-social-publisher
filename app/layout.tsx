import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anant Reach - Social Media & Multi-Channel Platform",
  description: "Anant Reach - Smart Multi-channel WhatsApp & Social Media Publishing Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Anant Reach",
  },
  icons: {
    icon: "/anant-reach-logo.png",
    shortcut: "/anant-reach-logo.png",
    apple: "/anant-reach-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col overflow-x-hidden w-full max-w-full">{children}</body>
    </html>
  );
}
