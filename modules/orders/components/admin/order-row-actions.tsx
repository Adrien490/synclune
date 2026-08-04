"use client";

import { EllipsisVertical } from "lucide-react";

import type {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	InvoiceStatus,
} from "@/app/generated/prisma/browser";
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
		invoiceStatus?: InvoiceStatus | null;
	};
}

export function OrderRowActions({ order }: OrderRowActionsProps) {
	const { sections } = useOrderActions({ order });

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
						aria-label={`Actions pour la commande ${order.orderNumber}`}
					/>
				}
			>
				<EllipsisVertical className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={`Commande ${order.orderNumber}`}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
