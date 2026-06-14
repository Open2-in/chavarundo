import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Caveat, Anek_Malayalam } from 'next/font/google';
import './globals.css'; // Global styles
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-handwriting', display: 'swap' });
const anekMalayalam = Anek_Malayalam({ subsets: ['malayalam'], variable: '--font-malayalam', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Chavarundo? | Community Public Waste & Garbage Tracker for Kerala',
  description: 'Community-driven public waste and garbage tracking map for Kerala. Report and track public waste (chavaru) in your area with our interactive map.',
  keywords: 'waste, garbage dump, garbage tracker, public waste, trash, map, community tracking, chavaru, Kerala roads, waste tracker, pollution, LSGD, PWD, Kerala',
  metadataBase: new URL('https://chavarundo.open2.in'),
  alternates: {
    canonical: 'https://chavarundo.open2.in',
  },
  openGraph: {
    title: 'Chavarundo? | Community Public Waste & Garbage Tracker for Kerala',
    description: 'Community-driven public waste and garbage tracking map for Kerala. Report and track public waste (chavaru) in your area with our interactive map.',
    url: 'https://chavarundo.open2.in',
    siteName: 'Chavarundo?',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Chavarundo? — Community Public Waste & Garbage Tracker for Kerala',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chavarundo? | Community Public Waste & Garbage Tracker for Kerala',
    description: 'Community-driven public waste and garbage tracking map. Report and track public waste.',
    images: ['/twitter-image'],
    site: '@chavarundo',
    creator: '@chavarundo',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  category: 'utilities',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Chavarundo?",
  url: "https://chavarundo.open2.in",
  description: "Community-driven public waste and garbage tracking map for Kerala. Report and track public waste (chavaru) with an interactive map.",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  areaServed: { "@type": "State", name: "Kerala", containedInPlace: { "@type": "Country", name: "India" } },
  inLanguage: ["en", "ml"],
  creator: { "@type": "Organization", name: "Chavarundo", url: "https://chavarundo.open2.in" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${caveat.variable} ${anekMalayalam.variable}`}>
      <head>
        <link rel="preconnect" href="https://a.tile.openstreetmap.org" />
        <link rel="preconnect" href="https://b.tile.openstreetmap.org" />
        <link rel="preconnect" href="https://c.tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <meta name="theme-color" content="#f8fafc" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body suppressHydrationWarning className="font-sans bg-slate-50 dark:bg-black text-slate-900 dark:text-white antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
