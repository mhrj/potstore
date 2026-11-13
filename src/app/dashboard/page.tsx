import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import DashboardView from "@/features/checkout/components/DashboardView";

export default async function DashboardPage() {
  const user = await requireUser();

  const [orders, addresses] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        totalToman: true,
        shippingCarrier: true,
        refId: true,
        trackingCode: true,
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productSlug: true,
            imageUrl: true,
            quantity: true,
            unitToman: true,
            lineTotalToman: true,
            variantTitle: true,
            colorData: true,
            isBundle: true,
            bundleSize: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.address.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        label: true,
        fullName: true,
        phone: true,
        province: true,
        city: true,
        postalCode: true,
        line1: true,
        line2: true,
        isDefault: true,
      },
      orderBy: { isDefault: "desc" },
    }),
  ]);

  return (
    <DashboardView
      user={{ id: user.id, fullName: user.fullName }}
      orders={orders}
      addresses={addresses}
    />
  );
}
