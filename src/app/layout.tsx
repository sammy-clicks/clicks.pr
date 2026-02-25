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
    apple: "/icon.jpg",
    icon: "/icon.jpg",
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
        {/* iOS PWA — use touch icon instead of a page screenshot */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Clicks" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.jpg" />
        <link rel="apple-touch-icon" sizes="1024x1024" href="/icon.jpg" />
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
