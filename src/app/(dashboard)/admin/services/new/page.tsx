import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import { ServiceForm } from '@/components/admin/ServiceForm';

export const dynamic = 'force-dynamic';

export default async function NewAdminServicePage() {
  await requireAdmin();

  return <ServiceForm isEdit={false} />;
}
