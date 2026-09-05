import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const APP_NAME = "Goal Tracker";
const APP_DESCRIPTION = "Track your goals, break them down with AI, and see your progress over time.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <ServiceWorkerRegister />
        <AuthProvider>
          <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
