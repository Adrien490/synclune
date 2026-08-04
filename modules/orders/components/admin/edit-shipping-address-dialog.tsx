"use client";

import { MapPinIcon } from "@phosphor-icons/react/ssr";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { EditShippingAddressForm } from "./edit-shipping-address-form";

export const EDIT_SHIPPING_ADDRESS_DIALOG_ID = "edit-shipping-address";

interface EditShippingAddressData {
	orderId: string;
	orderNumber: string;
	shippingFirstName: string;
	shippingLastName: string;
	shippingAddress1: string;
	shippingAddress2?: string | null;
	shippingPostalCode: string;
	shippingCity: string;
	shippingCountry: string;
	shippingPhone?: string | null;
	[key: string]: unknown;
}

export function EditShippingAddressDialog() {
	const dialog = useAlertDialog<EditShippingAddressData>(EDIT_SHIPPING_ADDRESS_DIALOG_ID);

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.close()}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<MapPinIcon className="size-5" aria-hidden="true" />
						Modifier l'adresse de livraison
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{dialog.data?.orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{dialog.data && (
					<EditShippingAddressForm
						key={`${dialog.data.orderId}-${dialog.isOpen}`}
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						shippingFirstName={dialog.data.shippingFirstName}
						shippingLastName={dialog.data.shippingLastName}
						shippingAddress1={dialog.data.shippingAddress1}
						shippingAddress2={dialog.data.shippingAddress2}
						shippingPostalCode={dialog.data.shippingPostalCode}
						shippingCity={dialog.data.shippingCity}
						shippingCountry={dialog.data.shippingCountry}
						shippingPhone={dialog.data.shippingPhone}
						onSuccess={dialog.close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
