"use client";

import { Truck } from "lucide-react";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import type { Carrier } from "@/modules/orders/utils/carrier.utils";
import { UpdateTrackingForm } from "./update-tracking-form";

export const UPDATE_TRACKING_DIALOG_ID = "update-tracking";

interface UpdateTrackingData {
	orderId: string;
	orderNumber: string;
	trackingNumber?: string;
	trackingUrl?: string;
	carrier?: Carrier;
	[key: string]: unknown;
}

export function UpdateTrackingDialog() {
	const dialog = useAlertDialog<UpdateTrackingData>(UPDATE_TRACKING_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<Truck className="size-5" />
						Modifier le suivi
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{dialog.data?.orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{dialog.data && (
					<UpdateTrackingForm
						key={`${dialog.data.orderId}-${dialog.isOpen}`}
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						initialTrackingNumber={dialog.data.trackingNumber}
						initialTrackingUrl={dialog.data.trackingUrl}
						initialCarrier={dialog.data.carrier}
						onSuccess={dialog.close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
