"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoteIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";

import type { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";
import type { InvoiceStatus } from "@/app/generated/prisma/client";
import {
	DefaultLongPressAffordance,
	LinkPendingOverlay,
} from "@/shared/components/long-press-menu-link";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
} from "@/shared/components/responsive-action-menu";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useGestureHintOnce } from "@/shared/hooks/use-gesture-hint-once";
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
	trackingNumber?: string | null;
	trackingUrl?: string | null;
	invoiceNumber?: string | null;
	invoiceStatus?: InvoiceStatus | null;
};

function OrderCardContent({ order }: { order: Order }) {
	return (
		<Item
			variant="outline"
			size="sm"
			className={"gap-3 motion-safe:transition-opacity"}
			aria-roledescription="carte commande"
		>
			<ItemContent className="min-w-0">
				<ItemTitle>
					<span
						className="truncate font-semibold"
						style={{ viewTransitionName: `order-number-${order.id}` }}
					>
						{order.orderNumber}
					</span>
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
 * - Tap : navigation vers la page détail.
 * - Long-press 500ms : ouvre le menu d'actions (parité row-actions desktop).
 * - Swipe droit (→) : ouvre les notes internes (safe action).
 *
 * `isFirst` active le « peek nudge » de découvrabilité (cf. `useGestureHintOnce`) :
 * seul le premier item de la première page joue la démo de swipe, une fois par appareil.
 */
export function OrdersMobileListItem({ order, isFirst }: { order: Order; isFirst?: boolean }) {
	// Hook appelé inconditionnellement (rules-of-hooks) mais désactivé hors 1er item :
	// aucune lecture localStorage superflue sur les autres cartes.
	const peek = useGestureHintOnce("admin-orders", { enabled: isFirst });
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);

	const { sections } = useOrderActions({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status as OrderStatus,
			paymentStatus: order.paymentStatus as PaymentStatus,
			trackingNumber: order.trackingNumber,
			trackingUrl: order.trackingUrl,
			invoiceNumber: order.invoiceNumber,
			invoiceStatus: order.invoiceStatus,
		},
	});

	const { bind } = useLongPress(() => setMenuOpen(true), {
		haptic: "medium",
		onClick: () => triggerHaptic("light"),
	});

	const openNotes = () => {
		router.push(`/admin/ventes/commandes/${order.id}/notes`);
	};

	return (
		<>
			<SwipeableCard
				className="rounded-lg"
				peek={peek}
				rightAction={{
					children: <NoteIcon className="text-secondary-foreground size-5" aria-hidden="true" />,
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
						"focus-ring relative block w-full rounded-lg pr-5",
						"transform-gpu motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.985]",
					)}
				>
					<OrderCardContent order={order} />
					{/* Même indice que les 10 autres listes admin : cette carte réimplémente
					    le pattern à la main (le `<Link>` doit vivre DANS `SwipeableCard`),
					    elle ne bénéficie donc pas du défaut de `LongPressMenuLink`. Sans
					    lui, le menu d'actions — seul chemin non gestuel vers les notes
					    depuis la liste — n'était annoncé par rien à l'écran. */}
					<DefaultLongPressAffordance />
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
