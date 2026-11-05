import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { AIAssistantSection } from '@/components/landing/AIAssistantSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { CTASection } from '@/components/landing/CTASection';
import { FAQSection } from '@/components/landing/FAQSection';
import { HomeChatbot } from '@/components/chatbot/HomeChatbot';
import prisma from '@/lib/prisma';
import { ServiceItem } from '@/types';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Fetch services dynamically from Prisma Database
  let dbServices: ServiceItem[] = [];
  try {
    const rawServices = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    dbServices = rawServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: Number(s.price),
      estimatedDuration: s.estimatedDuration,
      image: s.image,
      isActive: s.isActive,
    }));
  } catch (error) {
    console.error('Could not fetch services from database in LandingPage:', error);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors">
      {/* 1. Header Navigation */}
      <Navbar />

      <main className="flex-1">
        {/* 2. Hero Section: Judul, Deskripsi, Tombol Konsultasi AI & Pesan Service */}
        <HeroSection />

        {/* 3. Services Section: 8 Layanan IT (Laptop, PC, Install Ulang, Upgrade, Virus, Hardware, Jaringan, Support) */}
        <ServicesSection initialServices={dbServices} />

        {/* 4. How It Works: Konsultasi → Buat Pesanan → Proses Service → Selesai */}
        <HowItWorksSection />

        {/* 5. AI Assistant Promotion: Konsultasi masalah komputer dengan AI */}
        <AIAssistantSection />

        {/* 6. Trust & Quality Assurance Highlights */}
        <TrustSection />

        {/* 7. Call To Action (CTA Banner) */}
        <CTASection />

        {/* 8. Frequently Asked Questions */}
        <FAQSection />
      </main>

      {/* 9. Comprehensive Footer */}
      <Footer />

      {/* 10. Floating AI Chatbot (positioned fixed -> tidak memengaruhi layout) */}
      <HomeChatbot />
    </div>
  );
}
