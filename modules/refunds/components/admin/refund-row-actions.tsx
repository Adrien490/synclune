"use client";

import { EllipsisVertical } from "lucide-react";

import type { RefundStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useRefundActions } from "../../hooks/use-refund-actions";

interface RefundRowActionsProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
	};
}

export function RefundRowActions({ refund }: RefundRowActionsProps) {
	const { sections } = useRefundActions({ refund });

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label="Actions"
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions remboursement"
				description={refund.orderNumber}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
