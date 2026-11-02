// frontend/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Navbar from './components/Navbar';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'NextFlick',
    template: '%s · NextFlick',
  },
  description: 'Discover movies and build your personal watch list',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main style={{ minHeight: '100vh' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
