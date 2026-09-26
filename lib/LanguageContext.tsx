'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.why': 'Why CMNTY',
    'nav.architecture': 'Architecture',
    'nav.docs': 'Documentation',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Sign In',
    'nav.deploy_free': 'Deploy Free',
    'hero.title': 'Free Web Hosting & Edge Deployments',
    'hero.subtitle': 'Deploy your web applications instantly with automated subdomains, SSL certificates, and lightning-fast edge routing.',
    'hero.btn_deploy': 'Deploy New App',
    'hero.btn_create': 'Create Account',
    'features.title': 'Built for modern web developers',
    'features.subtitle': 'Everything you need to ship static sites, single page apps, and web tools to the cloud.',
    'features.f1_title': 'Instant Deployments',
    'features.f1_desc': 'Upload your build output or ZIP package and launch your site in seconds.',
    'features.f2_title': 'Free Custom Subdomains',
    'features.f2_desc': 'Get immediate live links on your choice of subdomain with automatic routing.',
    'features.f3_title': 'Automated SSL & Security',
    'features.f3_desc': 'Every deployment is secured automatically with Let’s Encrypt TLS certificates.',
    'steps.title': 'How CMNTY Hosting Works',
    'steps.subtitle': 'Three simple steps to deploy your web project from local machine to live production.',
    'steps.step1_title': 'Prepare Your Build',
    'steps.step1_desc': 'Build your static files or SPA using React, Next.js, Vite, Vue, or plain HTML.',
    'steps.step2_title': 'Upload & Configure',
    'steps.step2_desc': 'Drag & drop your ZIP folder or select a ready template in our dashboard.',
    'steps.step3_title': 'Go Live Instantly',
    'steps.step3_desc': 'Your site is built, routed, and secured with SSL in under 10 seconds.',
  },
  id: {
    'nav.why': 'Mengapa CMNTY',
    'nav.architecture': 'Arsitektur',
    'nav.docs': 'Dokumentasi',
    'nav.dashboard': 'Dasbor',
    'nav.login': 'Masuk',
    'nav.deploy_free': 'Hosting Gratis',
    'hero.title': 'Web Hosting Gratis & Deploy Cepat',
    'hero.subtitle': 'Luncurkan aplikasi web Anda secara instan dengan subdomain otomatis, sertifikat SSL gratis, dan rute edge super cepat.',
    'hero.btn_deploy': 'Deploy Aplikasi Baru',
    'hero.btn_create': 'Buat Akun Gratis',
    'features.title': 'Dirancang untuk Pengembang Modern',
    'features.subtitle': 'Semua yang Anda butuhkan untuk merilis situs statis, SPA, dan alat web ke cloud.',
    'features.f1_title': 'Deployment Instan',
    'features.f1_desc': 'Unggah file build atau file ZIP dan jalankan situs Anda dalam hitungan detik.',
    'features.f2_title': 'Subdomain Gratis',
    'features.f2_desc': 'Dapatkan tautan langsung dengan nama subdomain pilihan Anda dan opsi domain kustom.',
    'features.f3_title': 'SSL & Keamanan Otomatis',
    'features.f3_desc': 'Setiap deployment dilindungi secara otomatis dengan sertifikat TLS gratis.',
    'steps.title': 'Cara Kerja CMNTY Hosting',
    'steps.subtitle': 'Tiga langkah mudah untuk meluncurkan proyek web Anda dari lokal ke produksi.',
    'steps.step1_title': 'Siapkan File Build',
    'steps.step1_desc': 'Build proyek Anda menggunakan React, Next.js, Vite, Vue, atau HTML biasa.',
    'steps.step2_title': 'Unggah & Konfigurasi',
    'steps.step2_desc': 'Tarik & lepas file ZIP atau pilih templat bawaan di dasbor kami.',
    'steps.step3_title': 'Situs Berhasil Online',
    'steps.step3_desc': 'Situs Anda aktif, memiliki rute edge, dan terenkripsi SSL dalam waktu kurang dari 10 detik.',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cmnty_lang') as Language;
      if (saved && (saved === 'en' || saved === 'id')) {
        return saved;
      }
      if (navigator.language.startsWith('id')) {
        return 'id';
      }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cmnty_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      t: (key: string) => translations['en']?.[key] || key,
    };
  }
  return context;
};

export default LanguageContext;
