import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import Navbar from '@/components/Navbar';
import AnalyticsClient from '@/components/AnalyticsClient';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Карта потери опциональности',
  description: 'Одноэкранное доказательство потери опциональности и необратимости.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-ink-950 text-white transition-colors duration-200`}>
        <ThemeProvider>
          <AnalyticsClient />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
