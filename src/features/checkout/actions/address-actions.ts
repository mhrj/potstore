'use server';

import { requireUser } from '@/lib/auth';
import { normalizeAddressInput } from '@/lib/address';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import type { Address } from '@prisma/client';

export type AddressActionResult =
  | { success: true; address?: Address | null }
  | { success: false; error: string };

export async function saveAddressAction(
  data: unknown,
  addressId?: string,
): Promise<AddressActionResult> {
  try {
    const user = await requireUser();
    const normalized = normalizeAddressInput(data);

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findMany({
        where: { userId: user.id },
        select: { id: true, isDefault: true },
      });

      const shouldDefault = normalized.isDefault || existing.length === 0;

      if (shouldDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      if (addressId) {
        return tx.address.update({
          where: { id: addressId, userId: user.id },
          data: {
            label: normalized.label,
            fullName: normalized.fullName,
            phone: normalized.phone,
            province: normalized.province,
            provinceCode: normalized.provinceCode,
            city: normalized.city,
            cityCode: normalized.cityCode,
            postalCode: normalized.postalCode,
            line1: normalized.line1,
            line2: normalized.line2,
            isDefault: shouldDefault,
          },
        });
      }

      return tx.address.create({
        data: {
          userId: user.id,
          label: normalized.label,
          fullName: normalized.fullName,
          phone: normalized.phone,
          province: normalized.province,
          provinceCode: normalized.provinceCode,
          city: normalized.city,
          cityCode: normalized.cityCode,
          postalCode: normalized.postalCode,
          line1: normalized.line1,
          line2: normalized.line2,
          isDefault: shouldDefault,
        },
      });
    });

    revalidatePath('/checkout');
    revalidatePath('/dashboard');
    return { success: true, address: saved };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return { success: false, error: err.errors[0]?.message ?? 'اطلاعات وارد شده نامعتبر است' };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در ثبت آدرس',
    };
  }
}

export async function deleteAddressAction(addressId: string): Promise<AddressActionResult> {
  try {
    const user = await requireUser();

    await prisma.$transaction(async (tx) => {
      const target = await tx.address.findUnique({
        where: { id: addressId, userId: user.id },
        select: { id: true, isDefault: true },
      });

      if (!target) {
        throw new Error('آدرس مورد نظر یافت نشد');
      }

      await tx.address.delete({
        where: { id: addressId },
      });

      if (target.isDefault) {
        const first = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (first) {
          await tx.address.update({
            where: { id: first.id },
            data: { isDefault: true },
          });
        }
      }
    });

    revalidatePath('/checkout');
    revalidatePath('/dashboard');
    return { success: true, address: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطا در حذف آدرس',
    };
  }
}
