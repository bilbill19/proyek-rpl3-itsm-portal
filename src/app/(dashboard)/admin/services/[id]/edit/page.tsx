import React from 'react';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { ServiceForm } from '@/components/admin/ServiceForm';

export const dynamic = 'force-dynamic';

interface EditServicePageProps {
  params: {
    id: string;
  };
}

export default async function EditAdminServicePage({ params }: EditServicePageProps) {
  await requireAdmin();

  const service = await prisma.service.findUnique({
    where: { id: params.id },
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
