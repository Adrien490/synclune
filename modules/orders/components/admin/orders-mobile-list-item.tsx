"use client";

import Link from "next/link";
import { StickyNote } from "lucide-react";
import { useState } from "react";

import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
} from "@/shared/components/responsive-action-menu";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useLongPress } from "@/shared/hooks/use-long-press";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { useOrderActions } from "@/modules/orders/hooks/use-order-actions";
import { ORDER_NOTES_DIALOG_ID } from "./order-notes-dialog";

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
	fulfillmentStatus?: FulfillmentStatus | null;
	trackingNumber?: string | null;
	trackingUrl?: string | null;
	invoiceNumber?: string | null;
};

/**
 * Mobile item pour la liste des commandes.
 * - Tap : navigation vers la page détail.
 * - Long-press 500ms : ouvre le menu d'actions (parité row-actions desktop).
 * - Swipe droit (→) : ouvre les notes internes (safe action).
 */
export function OrdersMobileListItem({ order }: { order: Order }) {
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);
	const [menuOpen, setMenuOpen] = useState(false);

	const { sections } = useOrderActions({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status as OrderStatus,
			paymentStatus: order.paymentStatus as PaymentStatus,
			fulfillmentStatus: order.fulfillmentStatus,
			trackingNumber: order.trackingNumber,
			trackingUrl: order.trackingUrl,
			invoiceNumber: order.invoiceNumber,
		},
	});

	const { bind } = useLongPress(() => setMenuOpen(true), {
		haptic: "medium",
		onClick: () => triggerHaptic("light"),
	});

	const openNotes = () => {
		notesDialog.open({ orderId: order.id, orderNumber: order.orderNumber });
	};

	return (
		<>
			<SwipeableCard
				className="rounded-lg"
				rightAction={{
					children: <StickyNote className="text-secondary-foreground size-5" aria-hidden="true" />,
					label: `Ouvrir les notes de ${order.orderNumber}`,
					className: "bg-secondary",
					onAction: openNotes,
				}}
			>
				<Link
					href={`/admin/ventes/commandes/${order.id}`}
					aria-label={`Commande ${order.orderNumber}`}
					{...bind}
					className={cn(
						"focus-visible:ring-primary block w-full rounded-lg",
						"focus-visible:ring-2 focus-visible:outline-none",
						"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					)}
				>
					<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte commande">
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
				</Link>
			</SwipeableCard>

			<ResponsiveActionMenu open={menuOpen} onOpenChange={setMenuOpen}>
				<ResponsiveActionMenuContent
					title="Actions"
					description={`Commande ${order.orderNumber}`}
					sections={sections}
				/>
			</ResponsiveActionMenu>
		</>
	);
}
