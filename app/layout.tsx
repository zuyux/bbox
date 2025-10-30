import type { Metadata, Viewport } from "next";
import { Inter, Chakra_Petch, Lacquer } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { GetInButton } from "@/components/GetIn";
import Footer from "@/components/Footer";
import { Providers } from '@/components/ui/provider';
import { WalletProvider } from '@/components/WalletProvider';
import { Toaster } from "@/components/ui/sonner"
import AppLoadingProvider from "@/components/AppLoadingProvider";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const lacquer = Lacquer({
  variable: "--font-lacquer",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "BBOX - The Open Bitcoin App Store",
  description: "Discover, evaluate, and fund open-source Bitcoin applications",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BBOX',
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${chakraPetch.variable} ${lacquer.variable} antialiased`}>
        <GlobalErrorHandler />
        <WalletProvider>
          <Providers>
            <AppLoadingProvider>
              <GetInButton />
              <Navbar />              
              <main className="pb-20">
                {children}
              </main>
              <Footer />
            </AppLoadingProvider>
          </Providers>
        </WalletProvider>
        <Toaster />
      </body>
    </html>
  );
}
