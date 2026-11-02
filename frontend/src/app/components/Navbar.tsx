// frontend/app/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CloseIcon, MenuIcon, SearchIcon } from './Icons';
import styles from '../styles/navbar.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/favorites', label: 'My List' },
];

export default function Navbar() {
  const pathname = usePathname();
  // Path where the mobile menu was opened; the menu closes itself when the route changes
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const isMobileMenuOpen = mobileMenuPath === pathname;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuPath(isMobileMenuOpen ? null : pathname);
  };

  const linkClass = (href: string, base: string) =>
    `${base} ${pathname === href ? styles.active : ''}`;

  return (
    <nav
      className={`${styles.nav} ${isScrolled || isMobileMenuOpen ? styles.scrolled : ''}`}
      aria-label="Main"
    >
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo} aria-label="NextFlick home">
            NEXTFLICK
          </Link>

          <ul className={styles.links}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={linkClass(href, styles.link)}
                  aria-current={pathname === href ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.right}>
          <Link href="/search" className={styles.iconButton} aria-label="Search movies">
            <SearchIcon size={22} />
          </Link>
          <button
            className={styles.menuToggle}
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}
      >
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={linkClass(href, styles.mobileLink)}
            aria-current={pathname === href ? 'page' : undefined}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
