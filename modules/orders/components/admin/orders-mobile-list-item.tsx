"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, StickyNote } from "lucide-react";
import { useState } from "react";

import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";
import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import { LinkPendingOverlay } from "@/shared/components/long-press-menu-link";
import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
} from "@/shared/components/responsive-action-menu";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useLongPress } from "@/shared/hooks/use-long-press";
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

function OrderCardContent({
	order,
	isPendingItem,
	pendingLabel,
}: {
	order: Order;
	isPendingItem?: boolean;
	pendingLabel?: string | null;
}) {
	return (
		<Item
			variant="outline"
			size="sm"
			className={cn("gap-3 motion-safe:transition-opacity", isPendingItem && "opacity-60")}
			aria-roledescription="carte commande"
			aria-busy={isPendingItem ? true : undefined}
		>
			<ItemContent className="min-w-0">
				<ItemTitle>
					<span
						className="truncate font-semibold"
						style={{ viewTransitionName: `order-number-${order.id}` }}
					>
						{order.orderNumber}
					</span>
					{isPendingItem ? (
						<Badge
							variant="secondary"
							aria-live="polite"
							style={{ viewTransitionName: `order-status-${order.id}` }}
						>
							<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
							{pendingLabel}
						</Badge>
					) : (
						<>
							<Badge
								variant={ORDER_STATUS_VARIANTS[order.status]}
								style={{ viewTransitionName: `order-status-${order.id}` }}
							>
								{ORDER_STATUS_LABELS[order.status]}
							</Badge>
							<Badge
								variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]}
								style={{ viewTransitionName: `order-payment-${order.id}` }}
							>
								{PAYMENT_STATUS_LABELS[order.paymentStatus]}
							</Badge>
						</>
					)}
				</ItemTitle>
				<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<span>{order.customerName ?? order.customerEmail}</span>
					<span aria-hidden="true">·</span>
					<span className="font-medium" style={{ viewTransitionName: `order-total-${order.id}` }}>
						{formatEuro(order.total)}
					</span>
					<span aria-hidden="true">·</span>
					<span>{formatDateShort(order.createdAt)}</span>
					<span aria-hidden="true">·</span>
					<span>
						{order._count.items} article{order._count.items > 1 ? "s" : ""}
					</span>
				</ItemDescription>
			</ItemContent>
		</Item>
	);
}

/**
 * Mobile item pour la liste des commandes.
 *
 * - **Mode OFF** :
 *   - Tap : navigation vers la page détail.
 *   - Long-press 500ms : ouvre le menu d'actions (parité row-actions desktop).
 *   - Swipe droit (→) : ouvre les notes internes (safe action).
 * - **Mode sélection ON** : SwipeableCard, swipe et long-press désactivés ;
 *   la card devient `<button role="checkbox">` qui toggle la sélection (pattern
 *   Mail iOS, géré via `MobileSelectableCard`).
 */
export function OrdersMobileListItem({ order }: { order: Order }) {
	const ctx = useBulkSelectionContextOptional();
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(order.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;
	const router = useRouter();
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
		router.push(`/admin/ventes/commandes/${order.id}/notes`);
	};

	if (ctx?.selectionMode) {
		return (
			<MobileSelectableCard id={order.id} itemLabel={`Commande ${order.orderNumber}`}>
				<OrderCardContent order={order} isPendingItem={isPendingItem} pendingLabel={pendingLabel} />
			</MobileSelectableCard>
		);
	}

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
					prefetch={null}
					{...bind}
					style={{ ...bind.style, viewTransitionName: `order-card-${order.id}` }}
					className={cn(
						"focus-visible:ring-primary relative block w-full rounded-lg",
						"focus-visible:ring-2 focus-visible:outline-none",
						"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					)}
				>
					<OrderCardContent
						order={order}
						isPendingItem={isPendingItem}
						pendingLabel={pendingLabel}
					/>
					<LinkPendingOverlay />
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
