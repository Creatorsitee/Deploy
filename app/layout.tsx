import type { Metadata } from 'next';
import './globals.css'; // Global styles
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CMNTY Hosting — Free Web Hosting & Simple Deployment',
  description: 'Free hosting and simple deployment platform powered by CMNTY Edge API. Deploy static and modern web apps instantly with automated custom subdomains and SSL certificates.',
  keywords: [
    'free hosting',
    'web hosting',
    'simple deployment',
    'cloud edge api',
    'custom subdomains',
    'free ssl certificates',
    'nextjs hosting',
    'vite hosting',
    'react hosting',
    'static web deployment'
  ],
  authors: [{ name: 'CMNTY' }],
  robots: 'index, follow',
  alternates: {
    canonical: 'https://cmnty.biz.id',
  },
  openGraph: {
    title: 'CMNTY Hosting — Free Web Hosting & Simple Deployment',
    description: 'Free hosting and simple deployment platform powered by CMNTY Edge API. Deploy static and modern web apps instantly with automated custom subdomains and SSL certificates.',
    type: 'website',
    url: 'https://cmnty.biz.id',
    siteName: 'CMNTY Hosting',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CMNTY Hosting — Free Web Hosting & Simple Deployment',
    description: 'Free hosting and simple deployment platform powered by CMNTY Edge API. Deploy static and modern web apps instantly with automated custom subdomains and SSL certificates.',
    creator: '@cmnty',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'CMNTY Hosting',
    'url': 'https://cmnty.biz.id',
    'applicationCategory': 'DeveloperApplication',
    'operatingSystem': 'All',
    'description': 'Free hosting and simple deployment platform powered by CMNTY Edge API. Deploy static and modern web apps instantly with automated custom subdomains and SSL certificates.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
