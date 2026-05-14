"use client";

import { ReceiptText } from "lucide-react";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { EditBillingAddressForm } from "./edit-billing-address-form";

export const EDIT_BILLING_ADDRESS_DIALOG_ID = "edit-billing-address";

interface EditBillingAddressData {
	orderId: string;
	orderNumber: string;
	billingSameAsShipping: boolean;
	billingFirstName?: string | null;
	billingLastName?: string | null;
	billingAddress1?: string | null;
	billingAddress2?: string | null;
	billingPostalCode?: string | null;
	billingCity?: string | null;
	billingCountry?: string | null;
	billingPhone?: string | null;
	[key: string]: unknown;
}

export function EditBillingAddressDialog() {
	const dialog = useAlertDialog<EditBillingAddressData>(EDIT_BILLING_ADDRESS_DIALOG_ID);

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.close()}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<ReceiptText className="size-5" aria-hidden="true" />
						Modifier l'adresse de facturation
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{dialog.data?.orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{dialog.data && (
					<EditBillingAddressForm
						key={`${dialog.data.orderId}-${dialog.isOpen}`}
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						billingSameAsShipping={dialog.data.billingSameAsShipping}
						billingFirstName={dialog.data.billingFirstName}
						billingLastName={dialog.data.billingLastName}
						billingAddress1={dialog.data.billingAddress1}
						billingAddress2={dialog.data.billingAddress2}
						billingPostalCode={dialog.data.billingPostalCode}
						billingCity={dialog.data.billingCity}
						billingCountry={dialog.data.billingCountry}
						billingPhone={dialog.data.billingPhone}
						onSuccess={dialog.close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
