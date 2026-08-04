"use client";

import { UserIcon } from "@phosphor-icons/react/ssr";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { EditCustomerInfoForm } from "./edit-customer-info-form";

export const EDIT_CUSTOMER_INFO_DIALOG_ID = "edit-customer-info";

interface EditCustomerInfoData {
	orderId: string;
	orderNumber: string;
	customerEmail: string;
	customerName: string;
	[key: string]: unknown;
}

export function EditCustomerInfoDialog() {
	const dialog = useAlertDialog<EditCustomerInfoData>(EDIT_CUSTOMER_INFO_DIALOG_ID);

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.close()}>
			<ResponsiveDialogContent className="sm:max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<UserIcon className="size-5" aria-hidden="true" />
						Modifier les informations client
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{dialog.data?.orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{dialog.data && (
					<EditCustomerInfoForm
						key={`${dialog.data.orderId}-${dialog.isOpen}`}
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						customerEmail={dialog.data.customerEmail}
						customerName={dialog.data.customerName}
						onSuccess={dialog.close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
