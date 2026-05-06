"use client";

import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/enums";

import { Badge } from "@/shared/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "@/modules/refunds/constants/refund.constants";

import { REFUND_ITEM_DRAWER_ID, type RefundItemDrawerData } from "./refund-item-drawer";

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
	const { open } = useDialog<RefundItemDrawerData>(REFUND_ITEM_DRAWER_ID);
	const haptic = useHaptic();

	const handleOpen = () => {
		haptic("selection");
		open({ refund });
	};

	return (
		<button
			type="button"
			onClick={handleOpen}
			className={cn(
				"focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none",
				"focus-visible:ring-[3px]",
				"transform-gpu active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
			)}
			aria-label={`Ouvrir la fiche du remboursement ${refund.order.orderNumber}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte remboursement"
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{refund.order.orderNumber}</span>
						<Badge variant={REFUND_STATUS_VARIANTS[refund.status]}>
							{REFUND_STATUS_LABELS[refund.status]}
						</Badge>
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>{refund.order.customerName ?? refund.order.customerEmail}</span>
						<span aria-hidden="true">·</span>
						<span>{REFUND_REASON_LABELS[refund.reason]}</span>
						<span aria-hidden="true">·</span>
						<span className="font-medium">{formatEuro(refund.amount)}</span>
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(refund.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
