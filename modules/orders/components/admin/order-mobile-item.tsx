"use client";

import {
	type OrderStatus,
	type PaymentStatus,
	type FulfillmentStatus,
} from "@/app/generated/prisma/browser";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";

import { ORDER_ITEM_DRAWER_ID, type OrderItemDrawerData } from "./order-item-drawer";

interface OrderMobileItemProps {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus?: FulfillmentStatus | null;
		trackingNumber?: string | null;
		trackingUrl?: string | null;
		invoiceNumber?: string | null;
		total: number;
		customerName: string | null;
		customerEmail: string;
		createdAt: Date;
		_count: { items: number };
	};
}

export function OrderMobileItem({ order }: OrderMobileItemProps) {
	const { open } = useDialog<OrderItemDrawerData>(ORDER_ITEM_DRAWER_ID);

	const handleOpen = () => {
		open({
			order: {
				id: order.id,
				orderNumber: order.orderNumber,
				status: order.status,
				paymentStatus: order.paymentStatus,
				fulfillmentStatus: order.fulfillmentStatus ?? null,
				trackingNumber: order.trackingNumber ?? null,
				trackingUrl: order.trackingUrl ?? null,
				invoiceNumber: order.invoiceNumber ?? null,
				total: order.total,
				customerName: order.customerName,
				customerEmail: order.customerEmail,
				itemsCount: order._count.items,
				createdAt: order.createdAt,
			},
		});
	};

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la fiche de la commande ${order.orderNumber}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte commande"
			>
				<ItemContent className="min-w-0">
					<ItemTitle>
						<span className="truncate font-semibold">{order.orderNumber}</span>
						<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
							{ORDER_STATUS_LABELS[order.status]}
						</Badge>
						<Badge variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]}>
							{PAYMENT_STATUS_LABELS[order.paymentStatus]}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{order.customerName ?? order.customerEmail}</span>
						<span aria-hidden="true">·</span>
						<span className="font-medium">{formatEuro(order.total)}</span>
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(order.createdAt)}</span>
						<span aria-hidden="true">·</span>
						<span>
							{order._count.items} article{order._count.items > 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
