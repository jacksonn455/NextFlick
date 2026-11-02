// frontend/app/layout.tsx
'use client';

import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import './globals.css';
import styles from '../app/styles/navigation.module.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

// Note: Metadata should be moved to a separate metadata.ts file or handled differently in client components
// export const metadata: Metadata = {
//   title: 'NextFlick',
//   description: 'Search and manage your favorite movies',
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  return (
    <html lang="en">
      <head>
        <title>NextFlick</title>
        <meta name="description" content="Search and manage your favorite movies" />
      </head>
      <body className={inter.className}>
        <Providers>
          <nav className={`${styles['movie-search-header']} ${isScrolled ? styles.scrolled : ''}`}>
            <div className={styles['nav-container']}>
              <Link href="/" className={styles['nav-logo']}>
                <span className={styles['nav-logo-icon']}>🎬</span>
                NextFlick
              </Link>
              
              {/* Desktop Menu */}
              <div className={styles['nav-menu']}>
                <Link 
                  href="/" 
                  className={`${styles['nav-link']} ${isActivePath('/') ? styles.active : ''}`}
                >
                  Home
                </Link>
                <Link 
                  href="/search" 
                  className={`${styles['nav-link']} ${isActivePath('/search') ? styles.active : ''}`}
                >
                  Search
                </Link>
                <Link 
                  href="/favorites" 
                  className={`${styles['nav-link']} ${isActivePath('/favorites') ? styles.active : ''}`}
                >
                  Favorites
                </Link>
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                className={`${styles['mobile-menu-toggle']} ${isMobileMenuOpen ? styles.active : ''}`}
                onClick={toggleMobileMenu}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className={styles['mobile-menu-line']}></span>
                <span className={styles['mobile-menu-line']}></span>
                <span className={styles['mobile-menu-line']}></span>
              </button>
            </div>

            {/* Mobile Menu */}
            <div className={`${styles['mobile-menu']} ${isMobileMenuOpen ? styles.active : ''}`}>
              <div className={styles['mobile-nav-menu']}>
                <Link 
                  href="/" 
                  className={`${styles['mobile-nav-link']} ${isActivePath('/') ? styles.active : ''}`}
                >
                  Home
                </Link>
                <Link 
                  href="/search" 
                  className={`${styles['mobile-nav-link']} ${isActivePath('/search') ? styles.active : ''}`}
                >
                  Search
                </Link>
                <Link 
                  href="/favorites" 
                  className={`${styles['mobile-nav-link']} ${isActivePath('/favorites') ? styles.active : ''}`}
                >
                  Favorites
                </Link>
              </div>
            </div>
          </nav>
          
          {/* Main content with top padding to account for fixed header */}
          <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}