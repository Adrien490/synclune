"use client";

import Link from "next/link";
import { StickyNote } from "lucide-react";
import { StopEventPropagation } from "@/shared/components/stop-event-propagation";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { ORDER_NOTES_DIALOG_ID } from "./order-notes-dialog";
import { OrderRowActions } from "./order-row-actions";

type Order = {
	id: string;
	orderNumber: string;
	status: keyof typeof ORDER_STATUS_LABELS;
	paymentStatus: keyof typeof PAYMENT_STATUS_LABELS;
	customerName: string | null;
	customerEmail: string;
	total: number;
	createdAt: Date | string;
	_count: { items: number };
	fulfillmentStatus?: unknown;
	trackingNumber?: string | null;
	trackingUrl?: string | null;
	invoiceNumber?: string | null;
};

/**
 * Mobile item pour la liste des commandes avec swipe actions.
 * - Swipe droit (→) : ouvre les notes internes (safe action).
 * - Équivalent clavier : le dropdown OrderRowActions expose la même action.
 */
export function OrdersMobileListItem({ order }: { order: Order }) {
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);

	const openNotes = () => {
		notesDialog.open({ orderId: order.id, orderNumber: order.orderNumber });
	};

	return (
		<SwipeableCard
			className="rounded-lg"
			rightAction={{
				children: <StickyNote className="text-secondary-foreground size-5" aria-hidden="true" />,
				label: `Ouvrir les notes de ${order.orderNumber}`,
				className: "bg-secondary",
				onAction: openNotes,
			}}
		>
			<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte commande">
				<ItemContent className="min-w-0">
					<ItemTitle>
						<Link
							href={`/admin/ventes/commandes/${order.id}`}
							className="truncate font-semibold hover:underline"
						>
							{order.orderNumber}
						</Link>
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
				<ItemActions>
					<StopEventPropagation>
						<OrderRowActions
							order={{
								id: order.id,
								orderNumber: order.orderNumber,
								status: order.status as never,
								paymentStatus: order.paymentStatus as never,
								fulfillmentStatus: order.fulfillmentStatus as never,
								trackingNumber: order.trackingNumber,
								trackingUrl: order.trackingUrl,
								invoiceNumber: order.invoiceNumber,
							}}
						/>
					</StopEventPropagation>
				</ItemActions>
			</Item>
		</SwipeableCard>
	);
}
