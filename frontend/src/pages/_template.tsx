import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

/**
 * PAGE TEMPLATE · Land Valuation System
 * 
 * HOW TO USE THIS FILE:
 * 1. Copy this entire file
 * 2. Rename it to your new page name (e.g., dashboard.tsx, search.tsx, properties.tsx)
 * 3. Replace [PAGE_NAME], [PAGE_TITLE], [PAGE_DESCRIPTION] with your values
 * 4. Replace the CONTENT section with your actual page content
 * 5. Keep the nav and footer EXACTLY as they are (no modifications)
 * 6. Follow the DESIGN_SYSTEM.md for all styling
 * 7. Test on mobile before committing
 * 
 * IMPORTANT: This structure ensures all pages look and feel identical.
 */

interface TemplateProps {
  // Add your page-specific props here
}

const [PAGE_NAME]: React.FC<TemplateProps> = () => {
  const router = useRouter();
  const { data: session } = useSession();

  // If page requires authentication, redirect to login
  // useEffect(() => {
  //   if (!session) {
  //     router.push('/auth/login');
  //   }
  // }, [session, router]);

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>[PAGE_TITLE] · Land Valuation System</title>
        <meta name="description" content="[PAGE_DESCRIPTION]" />
        <meta property="og:title" content="[PAGE_TITLE]" />
        <meta property="og:description" content="[PAGE_DESCRIPTION]" />
      </Head>

      {/* MAIN LAYOUT */}
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        {/* ========================================
            NAVIGATION (DO NOT MODIFY)
            ======================================== */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              
              {/* Logo + Brand Name */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <a href="/" className="font-bold text-xl tracking-tight text-emerald-900 hover:text-emerald-700 transition">
                  Land<span className="text-emerald-600">Val</span>
                </a>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                <a href="/" className="hover:text-emerald-700 transition">Home</a>
                <a href="/search" className="hover:text-emerald-700 transition">Valuation</a>
                <a href="/marketplace" className="hover:text-emerald-700 transition">Marketplace</a>
                <a href="#" className="hover:text-emerald-700 transition">How it works</a>
                <a href="#" className="hover:text-emerald-700 transition">Contact</a>
              </div>

              {/* Language + Auth */}
              <div className="flex items-center gap-3">
                
                {/* Language Selector */}
                <div className="hidden sm:flex items-center border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white/80">
                  <i className="fas fa-globe text-emerald-600 mr-1 text-xs"></i>
                  <span className="font-medium">RW</span>
                  <i className="fas fa-chevron-down ml-1 text-gray-400 text-xs"></i>
                </div>

                {/* Auth Links - Show based on session */}
                {!session ? (
                  <>
                    <a href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2 transition">
                      Log in
                    </a>
                    <a href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">
                      Sign up
                    </a>
                  </>
                ) : (
                  <a href="/dashboard" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">
                    Dashboard
                  </a>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ========================================
            HERO / HEADER SECTION (OPTIONAL)
            ======================================== */}
        {/* Uncomment if page needs a hero section */}
        {/* 
        <section className="bg-gradient-to-b from-emerald-700 to-emerald-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                [PAGE_TITLE]
              </h1>
              <p className="text-lg text-emerald-50">
                [PAGE_SUBTITLE or DESCRIPTION]
              </p>
            </div>
          </div>
        </section>
        */}

        {/* ========================================
            MAIN CONTENT (YOUR CONTENT GOES HERE)
            ======================================== */}
        <main className="flex-1 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* SECTION 1 */}
            <section className="mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                Section Title
              </h2>
              
              {/* Content Grid Example */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Card Example */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-star text-emerald-700"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 ml-4">
                      Feature Title
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Feature description goes here. Keep it concise and focused on user benefit.
                  </p>
                  <a href="#" className="inline-flex items-center gap-2 mt-4 text-emerald-700 hover:text-emerald-800 font-medium text-sm transition">
                    Learn more
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>

                {/* Duplicate card as needed */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check-circle text-emerald-700"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 ml-4">
                      Feature Title 2
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Another feature description. This shows consistent card styling.
                  </p>
                  <a href="#" className="inline-flex items-center gap-2 mt-4 text-emerald-700 hover:text-emerald-800 font-medium text-sm transition">
                    Learn more
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>

              </div>
            </section>

            {/* SECTION 2 - Different Layout Example */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 md:p-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Full-Width Section
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Left Content</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <i className="fas fa-check text-green-600 mr-3 mt-1 flex-shrink-0"></i>
                      <span>Feature or benefit item</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-check text-green-600 mr-3 mt-1 flex-shrink-0"></i>
                      <span>Another feature or benefit</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-check text-green-600 mr-3 mt-1 flex-shrink-0"></i>
                      <span>One more feature or benefit</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Right Content</h3>
                  <p className="text-gray-600 mb-4">
                    Add your content here. This demonstrates a two-column layout on desktop, single column on mobile.
                  </p>
                  <button className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                    Call to Action
                  </button>
                </div>
              </div>
            </section>

          </div>
        </main>

        {/* ========================================
            CTA / CALL-TO-ACTION SECTION (OPTIONAL)
            ======================================== */}
        {/* Uncomment if page needs a final CTA section */}
        {/*
        <section className="bg-emerald-700 text-white py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-emerald-50 mb-8">
                Join thousands of users using Land Valuation System.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-lg font-semibold transition-colors">
                  Start Free
                </button>
                <button className="border-2 border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-colors">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>
        */}

        {/* ========================================
            FOOTER (DO NOT MODIFY)
            ======================================== */}
        <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Footer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              
              {/* Brand Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-sm"></i>
                  </div>
                  <span className="font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400">
                  Accurate land valuation powered by official Rwanda gazette data.
                </p>
              </div>

              {/* Product Links */}
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/search" className="text-gray-400 hover:text-emerald-400 transition">Valuation</a></li>
                  <li><a href="/marketplace" className="text-gray-400 hover:text-emerald-400 transition">Marketplace</a></li>
                  <li><a href="/subscriptions" className="text-gray-400 hover:text-emerald-400 transition">Subscription</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition">API</a></li>
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-emerald-400 transition">Contact</a></li>
                </ul>
              </div>

              {/* Social Links */}
              <div>
                <h4 className="font-semibold text-white mb-4 text-sm">Follow Us</h4>
                <div className="flex gap-4">
                  <a href="#" className="text-gray-400 hover:text-emerald-400 transition">
                    <i className="fab fa-twitter text-lg"></i>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-emerald-400 transition">
                    <i className="fab fa-linkedin text-lg"></i>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-emerald-400 transition">
                    <i className="fab fa-whatsapp text-lg"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-800 pt-8">
              <p className="text-center text-gray-500 text-sm">
                © 2026 Land Valuation System. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default [PAGE_NAME];

/* ========================================
   TEMPLATE USAGE NOTES:
   ======================================== 

1. REPLACE THESE PLACEHOLDERS:
   - [PAGE_NAME]: Component name (e.g., Dashboard, SearchPage)
   - [PAGE_TITLE]: Page title for <title> tag (e.g., "Dashboard")
   - [PAGE_DESCRIPTION]: Meta description (e.g., "View your dashboard and activity")

2. OPTIONAL SECTIONS:
   - Hero section (uncomment if needed)
   - CTA section (uncomment if needed)
   - Auth check (uncomment if page requires login)

3. DO NOT MODIFY:
   - Navigation bar structure
   - Footer structure
   - Overall layout structure (antialiased, min-h-screen, flex, flex-col)

4. STYLING RULES:
   - Use max-w-7xl mx-auto for content width
   - Use px-4 sm:px-6 lg:px-8 for responsive padding
   - Use py-12 md:py-16 for section spacing
   - Use gap-6 or space-y-6 for component spacing
   - Only colors: emerald, gray, white, red (for errors), green (for success)

5. RESPONSIVE DESIGN:
   - Mobile-first: grid-cols-1 base, then md:grid-cols-2, lg:grid-cols-3
   - Use hidden/flex with breakpoints: hidden md:flex
   - Test on 375px (iPhone 12 mini), 768px (tablet), 1440px (desktop)

6. COMMIT THIS AS:
   git add frontend/src/pages/[page-name].tsx
   git commit -m "feat: Build [page-name] page - consistent design system"

*/
