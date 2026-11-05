import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: {
    default: 'ITSM Portal | Solusi Perbaikan & Layanan IT Profesional Terpercaya',
    template: '%s | ITSM Portal',
  },
  description:
    'Platform manajemen layanan servis komputer, laptop, server, jaringan, dan perangkat IT bergaransi dengan AI diagnostic assistant, tracking real-time, dan transparansi harga resmi.',
  keywords: [
    'IT Service Management',
    'Service Laptop',
    'Service Komputer',
    'Reparasi PC',
    'Perbaikan Motherboard IC Power',
    'Install Ulang Windows',
    'Upgrade RAM SSD',
    'Pembersihan Virus Komputer',
    'Konsultasi IT AI',
    'Tracking Service Online',
  ],
  authors: [{ name: 'Bilbina Maharani' }],
  creator: 'Bilbina Maharani',
  publisher: 'IT Service Management Indonesia',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://itsm.app',
    siteName: 'ITSM - IT Service Management Portal',
    title: 'ITSM | Solusi Perbaikan & Layanan IT Profesional',
    description:
      'Solusi servis laptop, PC, dan IT bergaransi dengan konsultasi AI cerdas, estimasi biaya transparan, dan tracking tiket real-time.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ITSM | Solusi Perbaikan & Layanan IT Profesional',
    description:
      'Layanan servis komputer & IT bergaransi dengan AI assistant dan tracking real-time.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased min-h-screen flex flex-col font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
