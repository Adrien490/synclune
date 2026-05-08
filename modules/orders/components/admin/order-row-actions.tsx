"use client";

import { EllipsisVertical } from "lucide-react";

import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useOrderActions } from "../../hooks/use-order-actions";

interface OrderRowActionsProps {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus?: FulfillmentStatus | null;
		trackingNumber?: string | null;
		trackingUrl?: string | null;
		invoiceNumber?: string | null;
	};
}

export function OrderRowActions({ order }: OrderRowActionsProps) {
	const { sections } = useOrderActions({ order });

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label={`Actions pour la commande ${order.orderNumber}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={`Commande ${order.orderNumber}`}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
