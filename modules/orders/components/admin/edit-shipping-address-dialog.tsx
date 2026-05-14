"use client";

import { LoaderCircle, MapPin } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { COUNTRY_NAMES, SORTED_SHIPPING_COUNTRIES } from "@/shared/constants/countries";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useUpdateOrderShippingAddress } from "@/modules/orders/hooks/use-update-order-shipping-address";

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
	[key: string]: unknown;
}

export function EditShippingAddressDialog() {
	const dialog = useAlertDialog<EditShippingAddressData>(EDIT_SHIPPING_ADDRESS_DIALOG_ID);
	const { action, isPending } = useUpdateOrderShippingAddress(() => {
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

	const {
		orderId,
		orderNumber,
		shippingFirstName,
		shippingLastName,
		shippingAddress1,
		shippingAddress2,
		shippingPostalCode,
		shippingCity,
		shippingCountry,
	} = dialog.data;

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<MapPin className="size-5" aria-hidden="true" />
						Modifier l'adresse de livraison
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{orderNumber}</strong> — correction avant expédition. Bloqué dès que la
						commande est passée en expédition.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form action={action} className="space-y-4">
					<input type="hidden" name="id" value={orderId} />

					<RequiredFieldsNote />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="shippingFirstName">
								Prénom <span className="text-destructive">*</span>
							</Label>
							<Input
								id="shippingFirstName"
								name="shippingFirstName"
								type="text"
								defaultValue={shippingFirstName}
								autoComplete="given-name"
								required
								maxLength={50}
								disabled={isPending}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="shippingLastName">
								Nom <span className="text-destructive">*</span>
							</Label>
							<Input
								id="shippingLastName"
								name="shippingLastName"
								type="text"
								defaultValue={shippingLastName}
								autoComplete="family-name"
								required
								maxLength={50}
								disabled={isPending}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="shippingAddress1">
							Adresse <span className="text-destructive">*</span>
						</Label>
						<Input
							id="shippingAddress1"
							name="shippingAddress1"
							type="text"
							defaultValue={shippingAddress1}
							autoComplete="address-line1"
							required
							maxLength={255}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="shippingAddress2">Complément d'adresse</Label>
						<Input
							id="shippingAddress2"
							name="shippingAddress2"
							type="text"
							defaultValue={shippingAddress2 ?? ""}
							autoComplete="address-line2"
							maxLength={255}
							disabled={isPending}
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="shippingPostalCode">
								Code postal <span className="text-destructive">*</span>
							</Label>
							<Input
								id="shippingPostalCode"
								name="shippingPostalCode"
								type="text"
								inputMode="numeric"
								defaultValue={shippingPostalCode}
								autoComplete="postal-code"
								required
								maxLength={10}
								disabled={isPending}
							/>
						</div>
						<div className="col-span-2 space-y-2">
							<Label htmlFor="shippingCity">
								Ville <span className="text-destructive">*</span>
							</Label>
							<Input
								id="shippingCity"
								name="shippingCity"
								type="text"
								defaultValue={shippingCity}
								autoComplete="address-level2"
								required
								maxLength={100}
								disabled={isPending}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="shippingCountry">
							Pays <span className="text-destructive">*</span>
						</Label>
						<Select name="shippingCountry" defaultValue={shippingCountry} disabled={isPending}>
							<SelectTrigger id="shippingCountry">
								<SelectValue placeholder="Sélectionner un pays" />
							</SelectTrigger>
							<SelectContent>
								{SORTED_SHIPPING_COUNTRIES.map((code) => (
									<SelectItem key={code} value={code}>
										{COUNTRY_NAMES[code]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
