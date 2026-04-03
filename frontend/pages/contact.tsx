import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MainNavbar from '../src/components/MainNavbar';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send message.');
        return;
      }
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us | Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Contact Land Valuation System Rwanda for support, inquiries, or feedback." />
      </Head>
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        {/* NAVIGATION */}
        <MainNavbar />

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-xl mx-auto">
              <h1 className="text-3xl font-bold mb-6 text-center">Contact Us</h1>
              <p className="mb-6 text-gray-700 text-center">For any inquiries, suggestions, or support, please fill out the form below. Our team will respond as soon as possible. You can also email us directly at <a href="mailto:support@kcoders.org" className="text-blue-600 underline">support@kcoders.org</a>.</p>
              {submitted ? (
                <div className="bg-green-100 text-green-800 p-4 rounded mb-6 text-center">Thank you for contacting us! We will get back to you soon.</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded shadow">
                  <div>
                    <label className="block mb-1 font-medium">Name</label>
                    <input type="text" className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Email</label>
                    <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Message</label>
                    <textarea className="w-full border rounded px-3 py-2" rows={5} value={message} onChange={e => setMessage(e.target.value)} required />
                  </div>
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700">Send Message</button>
                </form>
              )}
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Brand Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Rwanda's trusted platform for accurate land and property valuation based on official gazette data.
                </p>
              </div>

              {/* Resources Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                  <li><Link href="/api" className="hover:text-emerald-400 transition-colors">API Reference</Link></li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                  <li><Link href="/careers" className="hover:text-emerald-400 transition-colors">Careers</Link></li>
                  <li><Link href="/partners" className="hover:text-emerald-400 transition-colors">Partners</Link></li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/data-protection" className="hover:text-emerald-400 transition-colors">Data Protection</Link></li>
                  <li><Link href="/compliance" className="hover:text-emerald-400 transition-colors">Compliance</Link></li>
                </ul>
              </div>

            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} LandVal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://twitter.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-twitter text-lg"></i>
                </a>
                <a href="https://linkedin.com/company/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-linkedin text-lg"></i>
                </a>
                <a href="https://facebook.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-facebook text-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
