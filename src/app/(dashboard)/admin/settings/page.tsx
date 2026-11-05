import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminSettingsManager } from '@/components/admin/AdminSettingsManager';
import { WhatsAppDeliveryHistory } from '@/components/admin/WhatsAppDeliveryHistory';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await requireAdmin();

  let totalUsers = 0;
  let totalOrders = 0;
  let totalServices = 0;
  let totalInventory = 0;
  let dbStatus = 'Connected';
  let dbLatencyMs = 0;

  try {
    const start = performance.now();
    const [userCount, orderCount, serviceCount, inventoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.serviceOrder.count(),
      prisma.service.count(),
      (prisma as any).inventoryItem.count(),
    ]);
    const end = performance.now();
    dbLatencyMs = Math.round(end - start);

    totalUsers = userCount;
    totalOrders = orderCount;
    totalServices = serviceCount;
    totalInventory = inventoryCount;
  } catch (error) {
    console.error('Error testing DB diagnostics:', error);
    dbStatus = 'Degraded';
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminSettingsManager
        user={{
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        }}
        systemStats={{
          totalUsers,
          totalOrders,
          totalServices,
          totalInventory,
          dbStatus,
          dbLatencyMs,
        }}
      />

      {/* P7 — Riwayat WhatsApp admin (read-only, tanpa secret) */}
      <WhatsAppDeliveryHistory />
    </div>
  );
}
