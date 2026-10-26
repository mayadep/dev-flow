import type { Metadata, Viewport } from "next";
import { AppShell } from "@/ui/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "dev flow · 심심할 때 개발 공부",
  description: "짧게 몰입하고, 쉬면서 떠올리는 개발 기본기 학습",
  appleWebApp: { capable: true, title: "dev flow", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
