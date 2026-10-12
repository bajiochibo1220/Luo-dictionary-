import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/luo-heritage.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/luo-heritage-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/luo-heritage-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/icons/luo-heritage-32.png",
    apple: { url: "/icons/luo-heritage-180.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <InstallAppPrompt />
        <Toaster richColors position="bottom-center" closeButton />
      </body>
    </html>
  );
}
