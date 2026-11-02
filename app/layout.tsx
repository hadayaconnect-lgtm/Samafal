import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "Samafal",
  description: "Le taxi le plus proche, en un instant. Djibouti.",
};

export const viewport: Viewport = {
  themeColor: "#0d2b3e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
