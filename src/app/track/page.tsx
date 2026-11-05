import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TrackingClient } from '@/components/tracking/TrackingClient';

export const dynamic = 'force-dynamic';

export default async function PublicTrackingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Main Header Navigation */}
      <Navbar />

      {/* Main Tracking Section */}
      <main className="flex-1 py-12 md:py-16">
        <TrackingClient />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
