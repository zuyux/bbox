import type { Metadata, Viewport } from "next";
import { Inter, Jersey_10, Lacquer } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { GetInButton } from "@/components/GetIn";
import Footer from "@/components/Footer";
import { Providers } from '@/components/ui/provider';
import { WalletProvider } from '@/components/WalletProvider';
import WelcomeModal from '@/components/WelcomeModal';
import { Toaster } from "@/components/ui/sonner"
import AppLoadingProvider from "@/components/AppLoadingProvider";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import { I18nProvider } from '@/components/I18nProvider';
import { headers } from 'next/headers';
import { defaultLocale, isLocale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
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

const jersey10 = Jersey_10({
  variable: "--font-jersey-10",
  subsets: ["latin"],
  weight: ["400"],
});

const lacquer = Lacquer({
  variable: "--font-lacquer",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "BBOX - Universal Registry for Verified Software",
  description: "Discover, evaluate, and fund verified open-source software",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestedLocale = (await headers()).get('x-bbox-locale');
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${jersey10.variable} ${lacquer.variable} antialiased`}>
        <I18nProvider locale={locale} messages={messages[locale]}>
        <GlobalErrorHandler />
        <WalletProvider>
          <Providers>
            <AppLoadingProvider>
              <a href="#main-content" className="skip-link">
                {messages[locale].accessibility.skip}
              </a>
              <GetInButton />
              <Navbar />              
              <WelcomeModal />
              <main id="main-content" tabIndex={-1} className="pb-28" aria-label={messages[locale].accessibility.main}>
                {children}
              </main>
              <Footer />
            </AppLoadingProvider>
          </Providers>
        </WalletProvider>
        <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
