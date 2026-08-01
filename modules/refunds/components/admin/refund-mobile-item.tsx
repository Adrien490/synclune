"use client";

import { ReceiptText } from "lucide-react";

import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/enums";

import { LongPressMenuLink } from "@/shared/components/long-press-menu-link";
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
import { useRefundActions } from "@/modules/refunds/hooks/use-refund-actions";

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

export function RefundMobileItem({ refund }: RefundMobileItemProps) {
	const { sections } = useRefundActions({
		refund: {
			id: refund.id,
			status: refund.status,
			amount: refund.amount,
			orderId: refund.order.id,
			orderNumber: refund.order.orderNumber,
			failureReason: refund.failureReason,
		},
	});

	return (
		<LongPressMenuLink
			href={`/admin/ventes/remboursements/${refund.id}`}
			ariaLabel={`Remboursement ${refund.order.orderNumber}`}
			sections={sections}
			menuTitle="Actions remboursement"
			menuDescription={refund.order.orderNumber}
			className="rounded-md text-left"
			viewTransitionName={`refund-card-${refund.id}`}
		>
			<Item
				variant="outline"
				size="sm"
				className={"w-full gap-3 motion-safe:transition-opacity"}
				aria-roledescription="carte remboursement"
			>
				<ItemMedia variant="icon">
					<ReceiptText
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
		</LongPressMenuLink>
	);
}
