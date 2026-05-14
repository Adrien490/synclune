"use client";

import { useState } from "react";
import { LoaderCircle, ReceiptText } from "lucide-react";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { useUpdateOrderBillingAddress } from "@/modules/orders/hooks/use-update-order-billing-address";

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
	const [sameAsShipping, setSameAsShipping] = useState(true);

	const { action, isPending } = useUpdateOrderBillingAddress(() => {
		dialog.close();
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
		} else if (open && dialog.data) {
			setSameAsShipping(dialog.data.billingSameAsShipping);
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
		billingFirstName,
		billingLastName,
		billingAddress1,
		billingAddress2,
		billingPostalCode,
		billingCity,
		billingCountry,
		billingPhone,
	} = dialog.data;

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<ReceiptText className="size-5" aria-hidden="true" />
						Modifier l'adresse de facturation
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{orderNumber}</strong> — correction avant émission de la facture
						(article 286 CGI). Bloqué dès que la facture est générée.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form action={action} className="space-y-4">
					<input type="hidden" name="id" value={orderId} />
					<input
						type="hidden"
						name="billingSameAsShipping"
						value={sameAsShipping ? "true" : "false"}
					/>

					<div className="bg-muted/30 flex items-start gap-x-3 rounded-lg border p-3">
						<Checkbox
							id="billingSameAsShipping"
							checked={sameAsShipping}
							onCheckedChange={(checked) => setSameAsShipping(checked === true)}
							disabled={isPending}
						/>
						<div className="space-y-1 leading-none">
							<Label htmlFor="billingSameAsShipping" className="cursor-pointer text-sm">
								Identique à l'adresse de livraison
							</Label>
							<p className="text-muted-foreground text-xs">
								La facture utilisera l'adresse de livraison.
							</p>
						</div>
					</div>

					{!sameAsShipping && (
						<>
							<RequiredFieldsNote />

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="billingFirstName">
										Prénom <span className="text-destructive">*</span>
									</Label>
									<Input
										id="billingFirstName"
										name="billingFirstName"
										type="text"
										defaultValue={billingFirstName ?? ""}
										autoComplete="given-name"
										required
										maxLength={50}
										disabled={isPending}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="billingLastName">
										Nom <span className="text-destructive">*</span>
									</Label>
									<Input
										id="billingLastName"
										name="billingLastName"
										type="text"
										defaultValue={billingLastName ?? ""}
										autoComplete="family-name"
										required
										maxLength={50}
										disabled={isPending}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="billingAddress1">
									Adresse <span className="text-destructive">*</span>
								</Label>
								<Input
									id="billingAddress1"
									name="billingAddress1"
									type="text"
									defaultValue={billingAddress1 ?? ""}
									autoComplete="address-line1"
									required
									maxLength={255}
									disabled={isPending}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="billingAddress2">Complément d'adresse</Label>
								<Input
									id="billingAddress2"
									name="billingAddress2"
									type="text"
									defaultValue={billingAddress2 ?? ""}
									autoComplete="address-line2"
									maxLength={255}
									disabled={isPending}
								/>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="billingPostalCode">
										Code postal <span className="text-destructive">*</span>
									</Label>
									<Input
										id="billingPostalCode"
										name="billingPostalCode"
										type="text"
										inputMode="numeric"
										defaultValue={billingPostalCode ?? ""}
										autoComplete="postal-code"
										required
										maxLength={10}
										disabled={isPending}
									/>
								</div>
								<div className="col-span-2 space-y-2">
									<Label htmlFor="billingCity">
										Ville <span className="text-destructive">*</span>
									</Label>
									<Input
										id="billingCity"
										name="billingCity"
										type="text"
										defaultValue={billingCity ?? ""}
										autoComplete="address-level2"
										required
										maxLength={100}
										disabled={isPending}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="billingCountry">
									Pays <span className="text-destructive">*</span>
								</Label>
								<Select
									name="billingCountry"
									defaultValue={billingCountry ?? "FR"}
									disabled={isPending}
								>
									<SelectTrigger id="billingCountry">
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

							<div className="space-y-2">
								<Label htmlFor="billingPhone">
									Téléphone <span className="text-destructive">*</span>
								</Label>
								<Input
									id="billingPhone"
									name="billingPhone"
									type="tel"
									inputMode="tel"
									defaultValue={billingPhone ?? ""}
									autoComplete="tel"
									required
									maxLength={20}
									disabled={isPending}
								/>
							</div>
						</>
					)}

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
