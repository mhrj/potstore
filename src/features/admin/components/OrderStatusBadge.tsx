import { StatusBadge } from '@/features/checkout';

export default function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge kind="order" value={status} />;
}
