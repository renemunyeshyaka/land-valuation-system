import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/benefits', label: 'Benefits' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/contact', label: 'Contact' },
];

export default function MainNavbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePath = useMemo(() => router.pathname, [router.pathname]);

  const isActive = (href: string) => {
    if (href === '/') return activePath === '/';
    return activePath === href || activePath.startsWith(`${href}/`);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-map-marked-alt text-white text-lg"></i>
            </div>
            <span className="font-bold text-xl tracking-tight text-emerald-900">
              Land<span className="text-emerald-600">Val</span>
            </span>
          </Link>

          <div className="hidden lg:flex space-x-7 text-sm font-medium text-gray-700">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600 pb-1' : 'hover:text-emerald-700 transition'}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="lg:hidden flex items-center">
            <button
              aria-label="Open menu"
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-emerald-800 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-bars text-2xl"></i>}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="hidden sm:flex items-center border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white/80">
              <i className="fas fa-globe text-emerald-600 mr-1 text-xs"></i>
              <span className="font-medium">RW</span>
              <i className="fas fa-chevron-down ml-1 text-gray-400 text-xs"></i>
            </div>
            <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">
              Log in
            </Link>
            <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200/70 shadow-lg fixed left-0 right-0 top-16 z-[80] pointer-events-auto">
          <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'text-emerald-700 font-semibold py-1' : 'hover:text-emerald-700 transition py-1'}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-2">
              <Link
                href="/auth/login"
                className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
