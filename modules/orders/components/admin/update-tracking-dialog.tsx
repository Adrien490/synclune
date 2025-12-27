"use client";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import {
	CARRIERS,
	detectCarrierAndUrl,
	type Carrier,
} from "@/modules/orders/services/carrier.service";
import { useStore } from "@tanstack/react-form";
import { Calendar, Mail, Truck } from "lucide-react";
import { useUpdateTrackingForm } from "@/modules/orders/hooks/use-update-tracking-form";

export const UPDATE_TRACKING_DIALOG_ID = "update-tracking";

interface UpdateTrackingData {
	orderId: string;
	orderNumber: string;
	trackingNumber?: string;
	trackingUrl?: string;
	carrier?: Carrier;
	estimatedDelivery?: Date;
	[key: string]: unknown;
}

function UpdateTrackingFormContent({
	orderId,
	orderNumber,
	initialTrackingNumber,
	initialTrackingUrl,
	initialCarrier,
	initialEstimatedDelivery,
	onClose,
}: {
	orderId: string;
	orderNumber: string;
	initialTrackingNumber?: string;
	initialTrackingUrl?: string;
	initialCarrier?: Carrier;
	initialEstimatedDelivery?: Date;
	onClose: () => void;
}) {
	const { form, action, isPending } = useUpdateTrackingForm({
		orderId,
		initialTrackingNumber,
		initialTrackingUrl,
		initialCarrier,
		initialEstimatedDelivery,
		onSuccess: () => {
			onClose();
		},
	});

	// Watch form values
	const trackingNumber = useStore(form.store, (state) => state.values.trackingNumber);
	const carrier = useStore(form.store, (state) => state.values.carrier);
	const trackingUrl = useStore(form.store, (state) => state.values.trackingUrl);
	const estimatedDelivery = useStore(form.store, (state) => state.values.estimatedDelivery);
	const sendEmail = useStore(form.store, (state) => state.values.sendEmail);

	// Auto-détection du transporteur directement dans onChange (pas de useEffect)
	const handleTrackingNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		form.setFieldValue("trackingNumber", value);

		// Auto-détecter si nouveau numéro >= 8 caractères et différent de l'initial
		if (value.length >= 8 && value !== initialTrackingNumber) {
			const detection = detectCarrierAndUrl(value);
			form.setFieldValue("carrier", detection.carrier);
			if (detection.url) {
				form.setFieldValue("trackingUrl", detection.url);
			}
		}
	};

	return (
		<>
			<ResponsiveDialogHeader>
				<ResponsiveDialogTitle className="flex items-center gap-2">
					<Truck className="h-5 w-5" />
					Modifier le suivi
				</ResponsiveDialogTitle>
				<ResponsiveDialogDescription>
					Commande <strong>{orderNumber}</strong>
				</ResponsiveDialogDescription>
			</ResponsiveDialogHeader>

			<form
				action={action}
				className="space-y-6"
				onSubmit={() => form.handleSubmit()}
			>
				{/* Hidden fields */}
				<input type="hidden" name="id" value={orderId} />
				<input type="hidden" name="trackingUrl" value={trackingUrl} />
				<input type="hidden" name="sendEmail" value={sendEmail ? "true" : "false"} />

				<RequiredFieldsNote />

				<div className="space-y-4">
					{/* Tracking Number Field */}
					<div className="space-y-2">
						<Label htmlFor="trackingNumber">
							Numéro de suivi <span className="text-destructive">*</span>
						</Label>
						<Input
							id="trackingNumber"
							name="trackingNumber"
							value={trackingNumber}
							onChange={handleTrackingNumberChange}
							placeholder="Ex: 8N00234567890"
							disabled={isPending}
							required
						/>
						<p className="text-xs text-muted-foreground">
							Le transporteur sera détecté automatiquement selon le format du numéro
						</p>
					</div>

					{/* Carrier Field */}
					<div className="space-y-2">
						<Label htmlFor="carrier">Transporteur</Label>
						<Select
							value={carrier}
							onValueChange={(value) => form.setFieldValue("carrier", value as Carrier)}
							disabled={isPending}
							name="carrier"
						>
							<SelectTrigger id="carrier">
								<SelectValue placeholder="Sélectionner un transporteur" />
							</SelectTrigger>
							<SelectContent>
								{CARRIERS.map((c) => (
									<SelectItem key={c.value} value={c.value}>
										{c.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{trackingNumber.length >= 8 && trackingNumber !== initialTrackingNumber && (
							<p className="text-xs text-emerald-600">
								Détecté automatiquement : {CARRIERS.find((c) => c.value === carrier)?.label}
							</p>
						)}
					</div>

					{/* Tracking URL (read-only, auto-generated) */}
					{trackingUrl && (
						<div className="space-y-2">
							<Label htmlFor="trackingUrlDisplay">URL de suivi (générée)</Label>
							<Input
								id="trackingUrlDisplay"
								value={trackingUrl}
								readOnly
								className="bg-muted text-muted-foreground text-sm"
							/>
						</div>
					)}

					{/* Estimated Delivery Date */}
					<div className="space-y-2">
						<Label htmlFor="estimatedDelivery" className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Date de livraison estimée
						</Label>
						<Input
							id="estimatedDelivery"
							name="estimatedDelivery"
							type="date"
							value={estimatedDelivery}
							onChange={(e) => form.setFieldValue("estimatedDelivery", e.target.value)}
							disabled={isPending}
						/>
						<p className="text-xs text-muted-foreground">
							Optionnel - Affichée dans l'email et sur le suivi client
						</p>
					</div>

					{/* Send Email Checkbox */}
					<div className="flex items-start space-x-3 rounded-lg border p-4 bg-muted/30">
						<Checkbox
							id="sendEmailCheckbox"
							checked={sendEmail}
							onCheckedChange={(checked) =>
								form.setFieldValue("sendEmail", checked === true)
							}
							disabled={isPending}
						/>
						<div className="space-y-1 leading-none">
							<Label
								htmlFor="sendEmailCheckbox"
								className="flex items-center gap-2 cursor-pointer"
							>
								<Mail className="h-4 w-4" />
								Envoyer un email au client
							</Label>
							<p className="text-xs text-muted-foreground">
								Un email avec les informations de suivi mises à jour sera envoyé
							</p>
						</div>
					</div>
				</div>

				{/* Submit buttons */}
				<ResponsiveDialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isPending}
					>
						Annuler
					</Button>
					<Button
						type="submit"
						disabled={isPending || !trackingNumber.trim()}
					>
						{isPending ? "Mise à jour..." : "Mettre à jour"}
					</Button>
				</ResponsiveDialogFooter>
			</form>
		</>
	);
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
				{dialog.data && (
					<UpdateTrackingFormContent
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						initialTrackingNumber={dialog.data.trackingNumber}
						initialTrackingUrl={dialog.data.trackingUrl}
						initialCarrier={dialog.data.carrier}
						initialEstimatedDelivery={dialog.data.estimatedDelivery}
						onClose={dialog.close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
