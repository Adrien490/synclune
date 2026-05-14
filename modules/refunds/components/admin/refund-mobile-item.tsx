"use client";

import { Loader2 } from "lucide-react";

import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/enums";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "@/modules/refunds/constants/refund.constants";
import { useRefundActions } from "@/modules/refunds/hooks/use-refund-actions";

interface RefundMobileItemProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		reason: RefundReason;
		createdAt: Date;
		order: {
			id: string;
			orderNumber: string;
			customerName: string | null;
			customerEmail: string;
		};
	};
}

export function RefundMobileItem({ refund }: RefundMobileItemProps) {
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(refund.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

	const { sections } = useRefundActions({
		refund: {
			id: refund.id,
			status: refund.status,
			amount: refund.amount,
			orderId: refund.order.id,
			orderNumber: refund.order.orderNumber,
		},
	});

	return (
		<MobileSelectableCard
			id={refund.id}
			itemLabel={`Remboursement ${refund.order.orderNumber}`}
			longPressProps={{
				href: `/admin/ventes/remboursements/${refund.id}`,
				ariaLabel: `Remboursement ${refund.order.orderNumber}`,
				sections,
				menuTitle: "Actions remboursement",
				menuDescription: refund.order.orderNumber,
				className: "rounded-md text-left",
				viewTransitionName: `refund-card-${refund.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn(
					"w-full gap-3 motion-safe:transition-opacity",
					isPendingItem && "opacity-60 dark:opacity-50",
				)}
				aria-roledescription="carte remboursement"
				aria-busy={isPendingItem || undefined}
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span
							className="truncate font-semibold"
							style={{ viewTransitionName: `refund-order-${refund.id}` }}
						>
							{refund.order.orderNumber}
						</span>
						{isPendingItem ? (
							<Badge
								variant="secondary"
								aria-live="polite"
								style={{ viewTransitionName: `refund-status-${refund.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={REFUND_STATUS_VARIANTS[refund.status]}
								style={{ viewTransitionName: `refund-status-${refund.id}` }}
							>
								{REFUND_STATUS_LABELS[refund.status]}
							</Badge>
						)}
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{refund.order.customerName ?? refund.order.customerEmail}</span>
						<span aria-hidden="true">·</span>
						<span>{REFUND_REASON_LABELS[refund.reason]}</span>
						<span aria-hidden="true">·</span>
						<span
							className="font-medium"
							style={{ viewTransitionName: `refund-amount-${refund.id}` }}
						>
							{formatEuro(refund.amount)}
						</span>
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(refund.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
