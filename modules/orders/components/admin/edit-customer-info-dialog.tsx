"use client";

import { LoaderCircle, User } from "lucide-react";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateOrderCustomerInfo } from "@/modules/orders/hooks/use-update-order-customer-info";

export const EDIT_CUSTOMER_INFO_DIALOG_ID = "edit-customer-info";

interface EditCustomerInfoData {
	orderId: string;
	orderNumber: string;
	customerEmail: string;
	customerName: string;
	customerPhone?: string | null;
	[key: string]: unknown;
}

export function EditCustomerInfoDialog() {
	const dialog = useAlertDialog<EditCustomerInfoData>(EDIT_CUSTOMER_INFO_DIALOG_ID);
	const { action, isPending } = useUpdateOrderCustomerInfo(() => {
		dialog.close();
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		}
	};

	if (!dialog.data) {
		return (
			<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
				<ResponsiveDialogContent />
			</ResponsiveDialog>
		);
	}

	const { orderId, orderNumber, customerEmail, customerName, customerPhone } = dialog.data;

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<User className="size-5" aria-hidden="true" />
						Modifier les informations client
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{orderNumber}</strong> — correction de typo email, nom ou téléphone.
						Bloqué après émission de la facture (immutabilité comptable).
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form action={action} className="space-y-4">
					<input type="hidden" name="id" value={orderId} />

					<RequiredFieldsNote />

					<div className="space-y-2">
						<Label htmlFor="customerName">
							Nom complet <span className="text-destructive">*</span>
						</Label>
						<Input
							id="customerName"
							name="customerName"
							type="text"
							defaultValue={customerName}
							autoComplete="name"
							required
							maxLength={100}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="customerEmail">
							Email <span className="text-destructive">*</span>
						</Label>
						<Input
							id="customerEmail"
							name="customerEmail"
							type="email"
							inputMode="email"
							defaultValue={customerEmail}
							autoComplete="email"
							required
							maxLength={255}
							disabled={isPending}
						/>
						<p className="text-muted-foreground text-xs">
							Toutes les notifications transactionnelles seront envoyées à cette adresse.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="customerPhone">Téléphone</Label>
						<Input
							id="customerPhone"
							name="customerPhone"
							type="tel"
							inputMode="tel"
							defaultValue={customerPhone ?? ""}
							autoComplete="tel"
							maxLength={20}
							disabled={isPending}
						/>
					</div>

					<ResponsiveDialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							{isPending ? "Mise à jour…" : "Enregistrer"}
						</Button>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
