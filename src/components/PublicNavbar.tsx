import { useState } from 'react';

interface PublicNavbarProps {
  isScrolled?: boolean;
  activePath?: string;
}

const NAV_LINKS = [
  { href: '/produit', label: 'Produit' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/ressources', label: 'Ressources' },
];

export default function PublicNavbar({ isScrolled, activePath }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className={`h-20 w-full fixed top-0 left-0 z-50 glass-header border-b border-outline-variant/30 px-4 sm:px-6 lg:px-12 flex items-center justify-between transition-all duration-300 ${isScrolled ? 'backdrop-blur-md' : ''}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-headline font-extrabold text-xl sm:text-2xl tracking-tight text-secondary">
              NovaSMS
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 ml-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  activePath === link.href ? 'text-primary' : 'text-secondary/70 hover:text-primary'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Desktop CTAs */}
        <div className="pub-nav-cta-desktop flex items-center gap-3">
          <a
            href="/login"
            className="text-sm font-bold text-secondary hover:bg-surface-variant/50 px-4 py-2.5 rounded-lg transition-all"
          >
            Connexion
          </a>
          <a
            href="/register"
            className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            Inscription
          </a>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          type="button"
          className="pub-nav-hamburger"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
            /* X icon */
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 4l12 12M16 4L4 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect y="4" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2" rx="1" fill="currentColor" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`pub-nav-mobile-menu ${mobileOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation mobile"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={activePath === link.href ? 'text-primary' : ''}
          >
            {link.label}
          </a>
        ))}
        <a href="/login" onClick={() => setMobileOpen(false)} className="pub-nav-mobile-login">
          Connexion
        </a>
        <a href="/register" onClick={() => setMobileOpen(false)} className="pub-nav-mobile-cta">
          Inscription gratuite
        </a>
      </div>

      {/* Backdrop when mobile menu open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
