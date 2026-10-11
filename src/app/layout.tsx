import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuoLinguaAI",
  description:
    "AI-powered digital platform for the preservation, learning, and promotion of the Dholuo language and Luo indigenous knowledge",
  applicationName: "LuoLinguaAI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/public-app.svg",
    shortcut: "/icons/public-app.svg",
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
