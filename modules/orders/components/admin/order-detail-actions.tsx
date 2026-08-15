"use client";

import { PencilSimpleIcon, ProhibitIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import type { OrderStatus } from "@/app/generated/prisma/client";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import {
	CANCEL_ORDER_DIALOG_ID,
	MARK_ORDER_AS_SHIPPED_DIALOG_ID,
	UPDATE_TRACKING_NUMBER_DIALOG_ID,
} from "../../constants/order.constants";
import type { OrderActionsData } from "../../hooks/use-order-actions";

interface OrderDetailActionsProps {
	orderId: string;
	orderLabel: string;
	status: OrderStatus;
}

/** Boutons de transition du détail — mêmes dialogs que le menu de ligne. */
export function OrderDetailActions({ orderId, orderLabel, status }: OrderDetailActionsProps) {
	const shipDialog = useAlertDialog<OrderActionsData>(MARK_ORDER_AS_SHIPPED_DIALOG_ID);
	const trackingDialog = useAlertDialog<OrderActionsData>(UPDATE_TRACKING_NUMBER_DIALOG_ID);
	const cancelDialog = useAlertDialog<OrderActionsData>(CANCEL_ORDER_DIALOG_ID);

	if (status !== "PAID" && status !== "PENDING" && status !== "SHIPPED") return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{status === "PAID" && (
				<Button onClick={() => shipDialog.open({ orderId, orderLabel })}>
					<TruckIcon aria-hidden="true" />
					Marquer expédiée
				</Button>
			)}
			{status === "SHIPPED" && (
				<Button variant="outline" onClick={() => trackingDialog.open({ orderId, orderLabel })}>
					<PencilSimpleIcon aria-hidden="true" />
					Corriger le n° de suivi
				</Button>
			)}
			{status === "PENDING" && (
				<Button
					variant="outline"
					className="text-destructive"
					onClick={() => cancelDialog.open({ orderId, orderLabel })}
				>
					<ProhibitIcon aria-hidden="true" />
					Annuler la commande
				</Button>
			)}
		</div>
	);
}
