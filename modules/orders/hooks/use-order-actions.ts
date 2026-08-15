"use client";

import { EyeIcon, PencilSimpleIcon, ProhibitIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import type { OrderStatus } from "@/app/generated/prisma/client";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import {
	CANCEL_ORDER_DIALOG_ID,
	MARK_ORDER_AS_SHIPPED_DIALOG_ID,
	UPDATE_TRACKING_NUMBER_DIALOG_ID,
} from "../constants/order.constants";

export interface OrderActionsData {
	orderId: string;
	/** Libellé humain — « n° 12 » ou l'id court à défaut de numéro. */
	orderLabel: string;
	/** Contrainte `AlertDialogData` du store d'overlays. */
	[key: string]: unknown;
}

interface UseOrderActionsParams {
	orderId: string;
	orderLabel: string;
	status: OrderStatus;
}

/**
 * Sections d'actions d'une commande — SSOT du menu de ligne desktop et du
 * détail. Les transitions offertes suivent la machine à états lean :
 * PAID → expédier, PENDING → annuler ; REFUNDED appartient au lot 5.
 */
export function useOrderActions({ orderId, orderLabel, status }: UseOrderActionsParams): {
	sections: ActionMenuSection[];
} {
	const { open: openShipDialog } = useAlertDialog<OrderActionsData>(
		MARK_ORDER_AS_SHIPPED_DIALOG_ID,
	);
	const { open: openTrackingDialog } = useAlertDialog<OrderActionsData>(
		UPDATE_TRACKING_NUMBER_DIALOG_ID,
	);
	const { open: openCancelDialog } = useAlertDialog<OrderActionsData>(CANCEL_ORDER_DIALOG_ID);

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "view",
					label: "Voir le détail",
					icon: EyeIcon,
					href: `/admin/ventes/commandes/${orderId}`,
				},
			],
		},
		{
			key: "transitions",
			items: [
				{
					key: "ship",
					label: "Marquer expédiée",
					icon: TruckIcon,
					hidden: status !== "PAID",
					onSelect: () => openShipDialog({ orderId, orderLabel }),
				},
				{
					// Pas une transition : corrige le `trackingNumber` d'une commande
					// déjà expédiée (faute de frappe sinon verrouillée par la garde PAID).
					key: "fix-tracking",
					label: "Corriger le n° de suivi",
					icon: PencilSimpleIcon,
					hidden: status !== "SHIPPED",
					onSelect: () => openTrackingDialog({ orderId, orderLabel }),
				},
				{
					key: "cancel",
					label: "Annuler la commande",
					icon: ProhibitIcon,
					variant: "destructive",
					hidden: status !== "PENDING",
					onSelect: () => openCancelDialog({ orderId, orderLabel }),
				},
			],
		},
	];

	return { sections };
}
