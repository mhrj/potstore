'use client';

import { useState } from 'react';
import AddressForm, { type AddressRecord } from '@/features/checkout/components/AddressForm';
import ConfirmModal from '@/components/ui/ConfirmModal';

const LABEL_TEXT: Record<AddressRecord['label'], string> = {
  HOME: 'خانه',
  WORK: 'محل کار',
  OTHER: 'سایر',
};

/**
 * Customer address book: add, edit, remove and pick the default.
 *
 * The list is held in local state and reconciled from each response so the
 * dashboard reflects the server's own default-promotion rules (the first
 * address, and the survivor after deleting the default, are both forced
 * default server-side) without a full page reload.
 */
export default function AddressBook({ initial }: { initial: AddressRecord[] }) {
  const [addresses, setAddresses] = useState<AddressRecord[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(initial.length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addressToDelete, setAddressToDelete] = useState<AddressRecord | null>(null);

  const upsert = (address: AddressRecord) => {
    setAddresses((current) => {
      const next = current.some((a) => a.id === address.id)
        ? current.map((a) => (a.id === address.id ? address : a))
        : [...current, address];
      // Only one address may render as the default, mirroring the server.
      return address.isDefault
        ? next.map((a) => (a.id === address.id ? a : { ...a, isDefault: false }))
        : next;
    });
    setEditingId(null);
    setAdding(false);
  };

  const makeDefault = async (address: AddressRecord) => {
    setBusyId(address.id);
    setError(null);
    const res = await fetch(`/api/addresses/${address.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        province: address.province,
        city: address.city,
        postalCode: address.postalCode,
        line1: address.line1,
        line2: address.line2 ?? '',
        isDefault: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data?.message ?? 'تغییر آدرس پیش‌فرض ناموفق بود');
      return;
    }
    upsert(data.address as AddressRecord);
  };

  const confirmRemove = async () => {
    if (!addressToDelete) return;
    const address = addressToDelete;
    setAddressToDelete(null);
    setBusyId(address.id);
    setError(null);
    const res = await fetch(`/api/addresses/${address.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data?.message ?? 'حذف آدرس ناموفق بود');
      return;
    }
    // Deleting the default promotes another address server-side, so re-read
    // rather than guessing which one took over.
    const refreshed = await fetch('/api/addresses').catch(() => null);
    if (refreshed?.ok) {
      const list = await refreshed.json().catch(() => null);
      if (Array.isArray(list?.addresses)) {
        setAddresses(list.addresses as AddressRecord[]);
        return;
      }
    }
    setAddresses((current) => current.filter((a) => a.id !== address.id));
  };

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-transparent bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) =>
          editingId === a.id ? (
            <li key={a.id} className="sm:col-span-2">
              <AddressForm
                idPrefix={`address-book-edit-${a.id}`}
                address={a}
                onSaved={upsert}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={a.id}
              className="flex flex-col rounded-2xl border border-soil-900/10 bg-white p-5 text-sm dark:border-dust-50/10 dark:bg-flora-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-soil-900 dark:text-dust-50">{a.fullName}</span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-dust-100 px-2.5 py-0.5 text-[10px] font-bold text-soil-700 dark:bg-flora-900 dark:text-dust-300 border border-transparent dark:border-dust-50/10">
                    {LABEL_TEXT[a.label]}
                  </span>
                  {a.isDefault && (
                    <span className="rounded-full border border-transparent bg-flora-100 px-2.5 py-0.5 text-[10px] font-bold text-flora-700 dark:border-flora-700 dark:bg-flora-950 dark:text-flora-300">
                      پیش‌فرض
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-2 grow leading-7 text-soil-700/80 dark:text-dust-200/80">
                {a.province}، {a.city}، {a.line1}
                {a.line2 ? `، ${a.line2}` : ''}
              </p>
              <p className="mt-2 text-xs text-soil-700/60 dark:text-dust-200/60">
                کد پستی: <span dir="ltr">{a.postalCode}</span> · تلفن:{' '}
                <span dir="ltr">{a.phone}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(a.id)}
                  className="rounded-full bg-dust-100 text-soil-900 hover:bg-dust-200 dark:bg-flora-950 dark:text-dust-300 dark:hover:bg-flora-900 border border-transparent dark:border-dust-50/10 px-3.5 py-2 text-[11px] font-bold transition-colors"
                >
                  ویرایش
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(a)}
                    disabled={busyId === a.id}
                    className="rounded-full border border-soil-900/15 px-3.5 py-2 text-[11px] font-bold text-soil-900 transition-colors hover:bg-dust-50 disabled:opacity-50 dark:border-dust-50/20 dark:text-dust-50 dark:hover:bg-flora-950"
                  >
                    {busyId === a.id ? 'در حال تغییر…' : 'انتخاب به‌عنوان پیش‌فرض'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAddressToDelete(a)}
                  disabled={busyId === a.id}
                  className="cursor-pointer rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
                >
                  حذف
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <AddressForm idPrefix="address-book-add" onSaved={upsert} onCancel={addresses.length > 0 ? () => setAdding(false) : undefined} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full cursor-pointer rounded-2xl border border-dashed border-soil-900/20 px-6 py-3.5 text-sm font-bold text-soil-900 transition hover:bg-dust-50 dark:border-dust-50/20 dark:text-dust-50 dark:hover:bg-flora-900"
        >
          + افزودن آدرس جدید
        </button>
      )}

      <ConfirmModal
        isOpen={Boolean(addressToDelete)}
        title="حذف آدرس"
        message={addressToDelete ? `آیا از حذف آدرس «${addressToDelete.fullName}» مطمئن هستید؟` : 'آیا از حذف این آدرس مطمئن هستید؟'}
        isDestructive={true}
        confirmText="حذف آدرس"
        cancelText="انصراف"
        onConfirm={confirmRemove}
        onCancel={() => setAddressToDelete(null)}
      />
    </div>
  );
}
