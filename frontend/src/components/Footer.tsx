import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Footer = () => {
  const { t } = useTranslation();
  return (
  <footer className="bg-emerald-950 text-emerald-200 py-12">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
      <div className="col-span-2">
        <div className="flex items-center gap-2 text-white">
          <i className="fas fa-map-marked-alt text-2xl"></i>
          <span className="font-bold text-xl">LandVal</span>
        </div>
        <p className="text-xs mt-2 text-emerald-300">Certified by National Cybersecurity Authority (NCSA)<br/>Data Protection & Privacy Office (DPO)</p>
        <p className="text-sm mt-3">{t('footer.disclaimer')}</p>
        <div className="flex gap-4 mt-5">
          <i className="fab fa-twitter hover:text-white text-xl"></i>
          <i className="fab fa-linkedin hover:text-white text-xl"></i>
          <i className="fab fa-whatsapp hover:text-white text-xl"></i>
        </div>
      </div>
      <div>
        <h4 className="font-bold text-white">{t('footer.product')}</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/valuation" className="hover:text-white transition">{t('nav.valuation')}</Link></li>
          <li><Link href="/marketplace" className="hover:text-white transition">{t('nav.marketplace')}</Link></li>
          <li>Pricing</li>
          <li>API</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">{t('footer.support')}</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/how-it-works" className="hover:text-white transition">{t('nav.howItWorks')}</Link></li>
          <li><Link href="/benefits" className="hover:text-white transition">{t('nav.benefits')}</Link></li>
          <li>{t('footer.faq')}</li>
          <li><Link href="/contact" className="hover:text-white transition">{t('nav.contact')}</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-white">{t('footer.legal')}</h4>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link href="/privacy" className="hover:text-white transition">{t('footer.privacyPolicy')}</Link></li>
          <li><Link href="/terms" className="hover:text-white transition">{t('footer.termsOfService')}</Link></li>
          <li>Copyright©2026,<br/>By the Rwanda Development Board (RDB).</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-emerald-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
      <div className="text-xs text-emerald-400">
        {t('footer.allRightsReserved')}
      </div>
      <LanguageSwitcher />
    </div>
  </footer>
);
};

export default Footer;
