import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartTotals } from "@/lib/cart";
import { calcShippingToman } from "@/lib/pricing";
import {
  calculateTapinRate,
  type ShippingAddressLike,
} from "@/lib/providers/shipping/tapin/rates";

export const runtime = "nodejs";

export type ShippingOption = {
  carrier: string;
  label: string;
  costToman: number;
  deliveryDays: string;
};

const schema = z.object({
  cityCode: z.union([z.number(), z.string()]).optional().nullable(),
  provinceCode: z.union([z.number(), z.string()]).optional().nullable(),
  weightGrams: z.number().optional().nullable(),
  addressId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "ابتدا وارد شوید" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "اطلاعات نامعتبر است" },
      { status: 400 },
    );
  }

  const { cityCode, provinceCode, addressId, city, province } = parsed.data;

  // 1) Determine address from database if addressId provided
  const address = addressId
    ? await prisma.address.findFirst({
        where: { id: addressId, userId: session.sub },
      })
    : null;

  // 2) Determine destination and numeric codes
  let resolvedCityCode: number | null = address?.cityCode ?? null;
  if (resolvedCityCode === null) {
    if (typeof cityCode === "number") {
      resolvedCityCode = cityCode;
    } else if (typeof cityCode === "string" && /^\d+$/.test(cityCode.trim())) {
      resolvedCityCode = parseInt(cityCode.trim(), 10);
    }
  }

  let resolvedProvinceCode: number | null = address?.provinceCode ?? null;
  if (resolvedProvinceCode === null) {
    if (typeof provinceCode === "number") {
      resolvedProvinceCode = provinceCode;
    } else if (typeof provinceCode === "string" && /^\d+$/.test(provinceCode.trim())) {
      resolvedProvinceCode = parseInt(provinceCode.trim(), 10);
    }
  }

  let destination = address?.city || city || "";
  if (!destination && typeof cityCode === "string" && !/^\d+$/.test(cityCode.trim())) {
    destination = cityCode.trim();
  }
  if (!destination) {
    destination = address?.province || province || "تهران";
  }

  const destinationProvince = address?.province || province || "تهران";

  // 3) Get totals and check free shipping
  const totals = await getCartTotals(session.sub);

  // Check Post Pishtaz weight limit (30 kg)
  if (totals.totalWeightGrams > 30000) {
    return NextResponse.json(
      {
        ok: false,
        error: "WEIGHT_LIMIT",
        message:
          "سفارش شما بیش از ۳۰ کیلوگرم است و امکان ارسال با پست پیشتاز وجود ندارد. لطفاً سفارش خود را به دو بخش تقسیم کنید یا با پشتیبانی تماس بگیرید.",
      },
      { status: 400 },
    );
  }

  const isFree = totals.payableToman >= 5_000_000;

  let shippingToman = 0;

  if (!isFree) {
    const addressLike: ShippingAddressLike = {
      fullName: address?.fullName ?? "مشتری",
      phone: address?.phone ?? "",
      province: destinationProvince,
      provinceCode: resolvedProvinceCode,
      city: destination,
      cityCode: resolvedCityCode,
      postalCode: address?.postalCode ?? "",
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? null,
    };

    try {
      const tapinResult = await calculateTapinRate(addressLike, totals.lines);
      shippingToman = tapinResult.costToman;
    } catch (error) {
      if (error instanceof Error && error.message === "WEIGHT_LIMIT_EXCEEDED") {
        return NextResponse.json(
          {
            ok: false,
            error: "WEIGHT_LIMIT",
            message:
              "سفارش شما بیش از ۳۰ کیلوگرم است و امکان ارسال با پست پیشتاز وجود ندارد. لطفاً سفارش خود را به دو بخش تقسیم کنید یا با پشتیبانی تماس بگیرید.",
          },
          { status: 400 },
        );
      }
      console.warn(
        "[shipping/calculate] Tapin rate failed, falling back to pricing engine:",
        error,
      );
      shippingToman = calcShippingToman(totals, destinationProvince);
    }
  }

  const effectiveCost = isFree ? 0 : shippingToman;

  const options: ShippingOption[] = [
    {
      carrier: "پست پیشتاز",
      label: "پست پیشتاز (۳ روز کاری)",
      costToman: effectiveCost,
      deliveryDays: "۳ روز کاری",
    },
  ];

  return NextResponse.json({
    ok: true,
    shippingToman: effectiveCost,
    isFree,
    options,
    shippingOptions: options,
    destination,
    cityCode: resolvedCityCode,
    provinceCode: resolvedProvinceCode,
  });
}
