import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

/**
 * PRIVACY POLICY PAGE · Land Valuation System
 * 
 * Public page with privacy and data handling information
 */

const Privacy: React.FC = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Privacy Policy for LandVal property valuation platform" />
        <meta property="og:title" content="Privacy Policy · LandVal" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        {/* NAVIGATION */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Rwanda Property Valuation</span>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/" className="px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors">
                  Home
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Page Header */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Privacy Policy
              </h1>
              <p className="text-lg text-gray-600">
                Last updated: March 2, 2026
              </p>
            </div>

            {/* Content */}
            <div className="space-y-8 text-gray-700">

              {/* 1. Introduction */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Introduction</h2>
                <p>
                  LandVal ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your personal data.
                </p>
              </section>

              {/* 2. Information We Collect */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Information We Collect</h2>
                <p className="mb-4">We collect information in the following ways:</p>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Information You Provide</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                  <li>Account information (name, email, phone, address)</li>
                  <li>Payment information (processed securely by third-party providers)</li>
                  <li>Property details (location, size, valuation requests)</li>
                  <li>Communications with our support team</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">Information Collected Automatically</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, interactions)</li>
                  <li>Location data (if you grant permission)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              {/* 3. How We Use Your Information */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve the Service</li>
                  <li>Process transactions and send related information</li>
                  <li>Send promotional emails and updates (with your consent)</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Analyze usage patterns and improve user experience</li>
                  <li>Prevent fraud and enhance security</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* 4. Data Sharing */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Data Sharing and Disclosure</h2>
                <p className="mb-4">We do not sell your personal data. We may share information with:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Service Providers:</strong> Third parties who help operate our Service (payment processors, hosting providers, analytics services)</li>
                  <li><strong>Legal Requirements:</strong> When required by law or legal process</li>
                  <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
                </ul>
              </section>

              {/* 5. Data Security */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Data Security</h2>
                <p>
                  We implement industry-standard security measures including encryption, secure servers, and access controls to protect your information. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              {/* 6. Cookies */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Cookies and Tracking</h2>
                <p className="mb-4">
                  We use cookies and similar technologies to enhance your experience, remember preferences, and analyze usage patterns. You can control cookie settings in your browser, though some features may not function properly if cookies are disabled.
                </p>
                <p>
                  Common cookie types include session cookies (temporary), persistent cookies (remember preferences), and analytics cookies (track usage).
                </p>
              </section>

              {/* 7. Your Rights */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Your Privacy Rights</h2>
                <p className="mb-4">Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Correct inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your data (right to be forgotten)</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                  <li><strong>Object:</strong> Object to certain processing activities</li>
                </ul>
              </section>

              {/* 8. Data Retention */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Data Retention</h2>
                <p>
                  We retain personal data for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. You can request data deletion at any time, subject to legal requirements and contractual obligations.
                </p>
              </section>

              {/* 9. Third-Party Links */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Third-Party Links</h2>
                <p>
                  The Service may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies before providing personal information.
                </p>
              </section>

              {/* 10. Children's Privacy */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Children's Privacy</h2>
                <p>
                  The Service is not intended for individuals under 18 years old. We do not knowingly collect information from minors. If we become aware that a minor has provided information, we will take steps to delete it.
                </p>
              </section>

              {/* 11. International Data Transfers */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">11. International Data Transfers</h2>
                <p>
                  Your information may be transferred, stored, and processed in countries other than your country of residence. By using the Service, you consent to such transfers, which may have different data protection laws.
                </p>
              </section>

              {/* 12. Changes to Privacy Policy */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">12. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy periodically. We will notify you of material changes by updating the "Last updated" date. Your continued use of the Service constitutes acceptance of the revised Privacy Policy.
                </p>
              </section>

              {/* 13. Contact Us */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">13. Contact Us</h2>
                <p>
                  For questions, concerns, or to exercise your privacy rights, please contact:
                </p>
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="font-semibold text-gray-800">Data Protection Officer</p>
                  <p className="text-gray-600">Email: privacy@landval.rw</p>
                  <p className="text-gray-600">Location: Kigali, Rwanda</p>
                </div>
              </section>

              {/* 14. GDPR Compliance */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">14. GDPR and International Compliance</h2>
                <p>
                  If you are in the EU or other jurisdictions with data protection regulations, LandVal complies with applicable laws including GDPR. You have the right to lodge a complaint with your local data protection authority.
                </p>
              </section>

            </div>

            {/* Navigation Links */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
              <Link href="/terms" className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-medium">
                <i className="fas fa-scroll mr-2"></i>
                Terms of Service
              </Link>
              <Link href="/" className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-medium">
                <i className="fas fa-home mr-2"></i>
                Back to Home
              </Link>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400">Rwanda's trusted land valuation platform.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Docs</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} LandVal. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Privacy;
