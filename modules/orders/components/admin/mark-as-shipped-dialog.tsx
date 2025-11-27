"use client";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
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
} from "@/shared/utils/carrier-detection";
import { useStore } from "@tanstack/react-form";
import { Mail, Truck } from "lucide-react";
import { useEffect, useCallback } from "react";
import { useMarkAsShippedForm } from "@/modules/orders/hooks/admin/use-mark-as-shipped-form";

export const MARK_AS_SHIPPED_DIALOG_ID = "mark-as-shipped";

interface MarkAsShippedData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

function MarkAsShippedFormContent({
	orderId,
	orderNumber,
	onClose,
}: {
	orderId: string;
	orderNumber: string;
	onClose: () => void;
}) {
	const { form, action, isPending } = useMarkAsShippedForm({
		orderId,
		onSuccess: () => {
			onClose();
		},
	});

	// Auto-détection du transporteur quand le numéro de suivi change
	const handleTrackingNumberChange = useCallback(
		(value: string) => {
			if (value.length >= 8) {
				const detection = detectCarrierAndUrl(value);
				// Mettre à jour le transporteur détecté
				form.setFieldValue("carrier", detection.carrier);
				// Mettre à jour l'URL si détectée
				if (detection.url) {
					form.setFieldValue("trackingUrl", detection.url);
				}
			}
		},
		[form]
	);

	// Watch trackingNumber changes
	const trackingNumber = useStore(form.store, (state) => state.values.trackingNumber);
	const carrier = useStore(form.store, (state) => state.values.carrier);
	const trackingUrl = useStore(form.store, (state) => state.values.trackingUrl);
	const sendEmail = useStore(form.store, (state) => state.values.sendEmail);

	useEffect(() => {
		if (trackingNumber.length >= 8) {
			handleTrackingNumberChange(trackingNumber);
		}
	}, [trackingNumber, handleTrackingNumberChange]);

	return (
		<>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2">
					<Truck className="h-5 w-5" />
					Marquer comme expédiée
				</DialogTitle>
				<DialogDescription>
					Commande <strong>{orderNumber}</strong>
				</DialogDescription>
			</DialogHeader>

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
							onChange={(e) => form.setFieldValue("trackingNumber", e.target.value)}
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
						{trackingNumber.length >= 8 && (
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
								Envoyer l'email de confirmation
							</Label>
							<p className="text-xs text-muted-foreground">
								Un email avec le numéro de suivi sera envoyé au client
							</p>
						</div>
					</div>
				</div>

				{/* Submit buttons */}
				<DialogFooter>
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
						{isPending ? "Expédition..." : "Valider l'expédition"}
					</Button>
				</DialogFooter>
			</form>
		</>
	);
}

export function MarkAsShippedDialog() {
	const dialog = useAlertDialog<MarkAsShippedData>(MARK_AS_SHIPPED_DIALOG_ID);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			dialog.close();
		}
	};

	return (
		<Dialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{dialog.data && (
					<MarkAsShippedFormContent
						orderId={dialog.data.orderId}
						orderNumber={dialog.data.orderNumber}
						onClose={dialog.close}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
