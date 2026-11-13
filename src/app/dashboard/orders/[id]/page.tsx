import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import OrderDetailView from '@/features/checkout/components/OrderDetailView';

type Props = { params: Promise<{ id: string }> };

export default async function DashboardOrderDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      paidAt: true,
      shippingCarrier: true,
      trackingCode: true,
      note: true,
      subtotalToman: true,
      discountToman: true,
      shippingToman: true,
      totalToman: true,
      channel: true,
      refId: true,
      shipFullName: true,
      shipPhone: true,
      shipProvince: true,
      shipCity: true,
      shipLine1: true,
      shipLine2: true,
      shipPostalCode: true,
      items: {
        select: {
          id: true,
          productId: true,
          productSlug: true,
          productName: true,
          sku: true,
          imageUrl: true,
          material: true,
          diameterCm: true,
          heightCm: true,
          variantId: true,
          variantTitle: true,
          isBundle: true,
          bundleSize: true,
          colorData: true,
          quantity: true,
          unitToman: true,
          lineTotalToman: true,
          tierLabel: true,
          product: {
            select: { bundleItems: true },
          },
        },
      },
      user: { select: { fullName: true, phone: true, email: true } },
    },
  });

  if (!order) notFound();

  return <OrderDetailView order={order} />;
}
