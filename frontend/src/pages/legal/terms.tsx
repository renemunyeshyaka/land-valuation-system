import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MainNavbar from '../../components/MainNavbar';

/**
 * TERMS OF SERVICE PAGE · Land Valuation System
 * 
 * Public page with full terms and conditions for using the platform
 */

const Terms: React.FC = () => {
  return (
    <>
      <Head>
        <title>Terms of Service · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Terms of Service for LandVal property valuation platform" />
        <meta property="og:title" content="Terms of Service · LandVal" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        <MainNavbar />

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Page Header */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Terms of Service
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
                  Welcome to LandVal ("we," "us," "our," or "Company"). These Terms of Service ("Terms") govern your use of our website, mobile application, and services (collectively, the "Service"). By accessing or using LandVal, you agree to be bound by these Terms. If you do not agree to all of these Terms, please do not use the Service.
                </p>
              </section>

              {/* 2. Eligibility */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Eligibility</h2>
                <p>
                  To use the Service, you must be at least 18 years old and capable of entering into a legally binding agreement. By using the Service, you represent and warrant that you meet these requirements.
                </p>
              </section>

              {/* 3. User Accounts */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3. User Accounts</h2>
                <p className="mb-4">
                  When you create an account with LandVal, you agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the confidentiality of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </section>

              {/* 4. Use License */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Use License</h2>
                <p className="mb-4">
                  Subject to these Terms, LandVal grants you a limited, non-exclusive, non-transferable license to use the Service for lawful purposes only. You agree not to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Modify or copy the materials in the Service</li>
                  <li>Use the materials for commercial purposes or for any public display</li>
                  <li>Attempt to decompile or reverse engineer any code in the Service</li>
                  <li>Transmit any unlawful, threatening, abusive, or harmful material</li>
                  <li>Violate any laws or regulations in your jurisdiction</li>
                </ul>
              </section>

              {/* 5. Subscription Services */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Subscription Services</h2>
                <p className="mb-4">
                  If you subscribe to a paid plan:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You authorize us to charge your payment method on a recurring basis</li>
                  <li>Billing occurs on the date you subscribe and each month thereafter</li>
                  <li>You may cancel your subscription at any time</li>
                  <li>No refunds are provided for partial months of service</li>
                  <li>We reserve the right to change pricing with 30 days' notice</li>
                </ul>
              </section>

              {/* 6. Valuation Accuracy */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Valuation Accuracy Disclaimer</h2>
                <p className="mb-4">
                  LandVal provides property valuations based on available data and algorithms. We make no warranty that:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Valuations are accurate or complete</li>
                  <li>Valuations are suitable for any particular purpose</li>
                  <li>Data sources are error-free or current</li>
                </ul>
                <p className="mt-4">
                  Valuations are provided for informational purposes only and should not be relied upon for legal, financial, or professional advice. Always consult qualified professionals before making property decisions.
                </p>
              </section>

              {/* 7. Intellectual Property */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Intellectual Property Rights</h2>
                <p>
                  All content, features, and functionality of the Service (including but not limited to software, text, graphics, logos, and button icons) are the exclusive property of LandVal or our content suppliers. You may not reproduce, distribute, or transmit any content without our prior written consent.
                </p>
              </section>

              {/* 8. User Content */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">8. User-Submitted Content</h2>
                <p>
                  By submitting information or content to LandVal, you grant us a worldwide, royalty-free license to use, reproduce, modify, and distribute such content. You warrant that you own or have obtained all necessary permissions for any content you submit.
                </p>
              </section>

              {/* 9. Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Limitation of Liability</h2>
                <p className="mb-4">
                  TO THE FULLEST EXTENT PERMITTED BY LAW, LANDVAL SHALL NOT BE LIABLE FOR:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Any indirect, incidental, special, or consequential damages</li>
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Damages resulting from mistakes, errors, or omissions</li>
                  <li>Any damages arising from use or inability to use the Service</li>
                </ul>
              </section>

              {/* 10. Indemnification */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless LandVal and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
                </p>
              </section>

              {/* 11. Third-Party Content */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">11. Third-Party Services</h2>
                <p>
                  The Service may contain links to third-party websites and services. We are not responsible for the content, accuracy, or practices of these external sites. Your use of third-party services is governed by their respective terms and policies.
                </p>
              </section>

              {/* 12. Modifications */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">12. Modifications to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. Continued use of the Service following any modifications constitutes your acceptance of the new Terms. We recommend reviewing these Terms periodically.
                </p>
              </section>

              {/* 13. Termination */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">13. Termination</h2>
                <p>
                  We may terminate or suspend your account and access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease.
                </p>
              </section>

              {/* 14. Governing Law */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Governing Law</h2>
                <p>
                  These Terms are governed by and construed in accordance with the laws of Rwanda, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts in Kigali, Rwanda.
                </p>
              </section>

              {/* 15. Contact Information */}
              <section>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">15. Contact Us</h2>
                <p>
                  For questions about these Terms, please contact us at:
                </p>
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="font-semibold text-gray-800">Land Valuation System</p>
                  <p className="text-gray-600">Email: legal@landval.rw</p>
                  <p className="text-gray-600">Location: Kigali, Rwanda</p>
                </div>
              </section>

            </div>

            {/* Navigation Links */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
              <Link href="/privacy" className="inline-flex items-center text-emerald-700 hover:text-emerald-800 font-medium">
                <i className="fas fa-shield-alt mr-2"></i>
                Privacy Policy
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

export default Terms;
