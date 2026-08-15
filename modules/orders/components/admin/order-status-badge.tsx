import type { OrderStatus } from "@/app/generated/prisma/client";
import { Badge } from "@/shared/components/ui/badge";
import { ORDER_STATUS_BADGE_VARIANTS, ORDER_STATUS_LABELS } from "../../constants/order.constants";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
	return <Badge variant={ORDER_STATUS_BADGE_VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
