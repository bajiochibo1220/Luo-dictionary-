import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { AppInstallationProvider } from "@/components/pwa/app-installation";
import { AppUpdatesProvider } from "@/components/pwa/app-updates";
import { APP_NAME } from "@/lib/brand";
import { WebInterfaceLanguageProvider } from "@/components/shared/web-interface-language";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=heritage-2", type: "image/x-icon", sizes: "16x16 32x32 48x48 256x256" },
      { url: "/icons/luo-heritage-32.png?v=heritage-2", type: "image/png", sizes: "32x32" },
      { url: "/icons/luo-heritage-192.png?v=heritage-2", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico?v=heritage-2",
    apple: { url: "/icons/luo-heritage-180.png?v=heritage-2", sizes: "180x180", type: "image/png" },
  },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  other: { "app-version": process.env.NEXT_PUBLIC_APP_VERSION || "development" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <WebInterfaceLanguageProvider><AppUpdatesProvider currentVersion={process.env.NEXT_PUBLIC_APP_VERSION || "development"}>
          <AppInstallationProvider><AuthProvider>{children}</AuthProvider></AppInstallationProvider>
          <Toaster richColors position="bottom-center" closeButton />
        </AppUpdatesProvider></WebInterfaceLanguageProvider>
      </body>
    </html>
  );
}
