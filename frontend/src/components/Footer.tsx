import Link from 'next/link';

const Footer = () => (
  <footer className="bg-emerald-950 text-emerald-200 py-12">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
      <div className="col-span-2">
        <div className="flex items-center gap-2 text-white">
          <i className="fas fa-map-marked-alt text-2xl"></i>
          <span className="font-bold text-xl">LandVal</span>
        </div>
        <p className="text-sm mt-3">The most trusted land valuation and land marketplace in Rwanda. All gazette data sourced from official publications.</p>
        <div className="flex gap-4 mt-5">
          <i className="fab fa-twitter hover:text-white text-xl"></i>
          <i className="fab fa-linkedin hover:text-white text-xl"></i>
          <i className="fab fa-whatsapp hover:text-white text-xl"></i>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-white">Product</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li>Valuation</li>
          <li>Marketplace</li>
          <li>Pricing</li>
          <li>API</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">Resources</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li>Gazette 2025</li>
          <li>Help center</li>
          <li>Blog</li>
          <li>Developers</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">Legal</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
          <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
          <li>Copyright©</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-emerald-800 mt-10 pt-6 text-center text-xs text-emerald-400">
      © 2026 Land Valuation System Ltd. All rights reserved.
    </div>
  </footer>
);

export default Footer;
