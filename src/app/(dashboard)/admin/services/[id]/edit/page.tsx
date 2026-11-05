
import React from 'react';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { ServiceForm } from '@/components/admin/ServiceForm';

export const dynamic = 'force-dynamic';

interface EditServicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAdminServicePage({
  params,
}: EditServicePageProps) {
  await requireAdmin();

  // Next.js 15: params harus di-await
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    notFound();
  }

  return (
    <ServiceForm
      isEdit={true}
      initialData={{
        id: service.id,
        name: service.name,
        description: service.description,
        price: Number(service.price),
        estimatedDuration: service.estimatedDuration,
        image: service.image,
        isActive: service.isActive,
      }}
    />
  );
}
