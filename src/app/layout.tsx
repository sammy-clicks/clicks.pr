import "./globals.css";
import type { Metadata } from "next";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import { OrderTrackerProvider } from "../components/OrderTrackerProvider";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Clicks V1",
  description: "Clicks V1 PWA Starter",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Prevent flash of wrong theme — runs before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.setItem('theme','dark');}catch(e){}document.documentElement.setAttribute('data-theme','dark');})();`,
          }}
        />
      </head>
      <body>
        <OrderTrackerProvider>
          {children}
        </OrderTrackerProvider>
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
