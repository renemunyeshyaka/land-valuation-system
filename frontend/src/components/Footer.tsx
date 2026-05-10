import Link from 'next/link';

const Footer = () => (
  <footer className="bg-emerald-950 text-emerald-200 py-12">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
      <div className="col-span-2">
        <div className="flex items-center gap-2 text-white">
          <i className="fas fa-map-marked-alt text-2xl"></i>
          <span className="font-bold text-xl">LandVal</span>
        </div>
        <p className="text-xs mt-2 text-emerald-300">Certified by National Cybersecurity Authority (NCSA)<br/>Data Protection & Privacy Office (DPO)</p>
        <p className="text-sm mt-3">All gazette data sourced from official Rwanda Land Authority publications.</p>
        <div className="flex gap-4 mt-5">
          <i className="fab fa-twitter hover:text-white text-xl"></i>
          <i className="fab fa-linkedin hover:text-white text-xl"></i>
          <i className="fab fa-whatsapp hover:text-white text-xl"></i>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-white">Product</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/valuation" className="hover:text-white transition">Valuation</Link></li>
          <li><Link href="/marketplace" className="hover:text-white transition">Marketplace</Link></li>
          <li>Pricing</li>
          <li>API</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">Resources</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/how-it-works" className="hover:text-white transition">How It Works</Link></li>
          <li><Link href="/benefits" className="hover:text-white transition">Benefits</Link></li>
          <li>Help Center</li>
          <li>Blog</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">Legal</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
          <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
          <li>Copyright©2026,<br/>By the Rwanda Development Board (RDB).</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-emerald-800 mt-10 pt-6 text-center text-xs text-emerald-400">
      Copyright © 2026. By the Rwanda Development Board (RDB).
    </div>
  </footer>
);

export default Footer;
