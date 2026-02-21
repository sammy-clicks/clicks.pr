import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clicks V1",
  description: "Clicks V1 PWA Starter",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
