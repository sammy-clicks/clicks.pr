import "./globals.css";
import type { Metadata } from "next";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import { OrderTrackerProvider } from "../components/OrderTrackerProvider";
import { CartProvider } from "../components/CartContext";
import { CartWidget } from "../components/CartWidget";
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
        <link rel="apple-touch-icon" href="/flow-3.png" />
        {/* Prevent flash of wrong theme — runs before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.setItem('theme','dark');}catch(e){}document.documentElement.setAttribute('data-theme','dark');})();`,
          }}
        />
      </head>
      <body>
        <CartProvider>
          <OrderTrackerProvider>
            {children}
            <CartWidget />
          </OrderTrackerProvider>
        </CartProvider>
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
