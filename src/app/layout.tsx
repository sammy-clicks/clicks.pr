import "./globals.css";
import type { Metadata } from "next";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import { OrderTrackerProvider } from "../components/OrderTrackerProvider";
import { CartProvider } from "../components/CartContext";
import { CartWidget } from "../components/CartWidget";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Clicks",
  description: "Clicks — your night out, tracked.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/flow-3.png",
    icon: "/flow-3.png",
  },
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
