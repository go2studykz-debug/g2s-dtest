import type {Metadata} from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'go2study | Диагностика НИШ',
  description: 'Профессиональная диагностика знаний для подготовки к НИШ, БИЛ и РФМШ. Выявим пробелы и составим личный план.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon-180.png',
  },
  themeColor: '#2747E0',
  openGraph: {
    title: 'go2study | Диагностика НИШ',
    description: 'Профессиональная диагностика знаний для подготовки к НИШ, БИЛ и РФМШ.',
    url: 'https://test.go2study.kz',
    images: [
      {
        url: 'https://test.go2study.kz/og-image.png',
        width: 2048,
        height: 683,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'go2study | Диагностика НИШ',
    images: ['https://test.go2study.kz/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
