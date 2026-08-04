"use client";

import { ReceiptIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "@/modules/refunds/constants/refund.constants";

interface RefundMobileItemProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		reason: RefundReason;
		createdAt: Date;
		failureReason?: string | null;
		order: {
			id: string;
			orderNumber: string;
			customerName: string | null;
			customerEmail: string;
		};
	};
}

/**
 * Carte remboursement (liste mobile admin) — consultation pure : le workflow
 * (approve/reject/process) est parti au Lot 2 S3.3, les remboursements se font
 * depuis le dashboard Stripe et arrivent ici par la synchro webhook. Plus de
 * long-press menu : un tap ouvre le détail.
 */
export function RefundMobileItem({ refund }: RefundMobileItemProps) {
	return (
		<Link
			href={`/admin/ventes/remboursements/${refund.id}`}
			aria-label={`Remboursement ${refund.order.orderNumber}`}
			className="block rounded-md text-left"
			style={{ viewTransitionName: `refund-card-${refund.id}` }}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte remboursement"
			>
				<ItemMedia variant="icon">
					<ReceiptIcon
						className="text-muted-foreground size-5"
						aria-hidden="true"
						style={{ viewTransitionName: `refund-icon-${refund.id}` }}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span
							className="truncate font-semibold"
							style={{ viewTransitionName: `refund-order-${refund.id}` }}
						>
							{refund.order.orderNumber}
						</span>
						<Badge
							variant={REFUND_STATUS_VARIANTS[refund.status]}
							style={{ viewTransitionName: `refund-status-${refund.id}` }}
						>
							{REFUND_STATUS_LABELS[refund.status]}
						</Badge>
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
		</Link>
	);
}
