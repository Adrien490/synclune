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
import { FieldLabel } from "@/shared/components/forms/field-label";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
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
	getTrackingUrl,
	type Carrier,
} from "@/modules/orders/utils/carrier.utils";
import { useStore } from "@tanstack/react-form";
import { EnvelopeIcon, LinkIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useMarkAsShippedForm } from "@/modules/orders/hooks/use-mark-as-shipped-form";
import { TRACKING_NUMBER_MAX_LENGTH } from "@/modules/orders/constants/order.constants";

export const MARK_AS_SHIPPED_DIALOG_ID = "mark-as-shipped";

interface MarkAsShippedData {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
}

function MarkAsShippedFormContent({
	orderId,
	orderNumber,
	open,
	onClose,
}: {
	orderId: string;
	orderNumber: string;
	open: boolean;
	onClose: () => void;
}) {
	const { form, state, action, isPending } = useMarkAsShippedForm({
		orderId,
		onSuccess: () => {
			onClose();
		},
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	// Le `ResponsiveDialog` est rendu ICI, et non chez le parent, parce que c'est
	// ce composant qui possède `isPending` : il faut le lire pour bloquer la
	// fermeture (clic extérieur / Échap) pendant la mutation. Le parent le
	// recevait auparavant via `onPendingChange` appelé depuis un `useEffect` de
	// pur passe-plat, qui recopiait dans un `useState` une valeur que
	// `useActionState` possédait déjà.
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && !isPending) {
			onClose();
		}
	};

	// Watch form values
	const trackingNumber = useStore(form.store, (state) => state.values.trackingNumber);
	const carrier = useStore(form.store, (state) => state.values.carrier);
	const trackingUrl = useStore(form.store, (state) => state.values.trackingUrl);
	const sendEmail = useStore(form.store, (state) => state.values.sendEmail);
	const customUrlMode = useStore(form.store, (state) => state.values.customUrlMode);

	// L'URL est editable si mode custom ou si carrier = "autre"
	const isUrlEditable = customUrlMode || carrier === "autre";

	// Auto-détection du transporteur directement dans onChange (pas de useEffect)
	const handleTrackingNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		form.setFieldValue("trackingNumber", value);

		// Auto-détecter si numéro >= 8 caractères et mode auto
		if (value.length >= 8 && !customUrlMode) {
			const detection = detectCarrierAndUrl(value);
			form.setFieldValue("carrier", detection.carrier);
			if (detection.url) {
				form.setFieldValue("trackingUrl", detection.url);
			}
		}
	};

	// Gestion du changement de carrier
	const handleCarrierChange = (value: Carrier) => {
		form.setFieldValue("carrier", value);

		// Re-générer l'URL si pas en mode custom
		if (!customUrlMode && trackingNumber.length >= 8) {
			// `getTrackingUrl(value, …)` et NON `detectCarrierAndUrl(trackingNumber)` :
			// un choix explicite de l'admin doit primer sur la détection de format.
			// `CARRIER_PATTERNS` ne connaît que 5 des 11 transporteurs, si bien que
			// re-dériver depuis le numéro laissait GLS/DHL/UPS/FedEx/Relais Colis
			// sans URL (détectés "autre") — et l'email d'expédition sans lien de suivi.
			form.setFieldValue("trackingUrl", getTrackingUrl(value, trackingNumber) ?? "");
		}
	};

	return (
		<ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<TruckIcon className="size-5" />
						Marquer comme expédiée
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande <strong>{orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form action={action} className="space-y-6">
					{/* Hidden fields */}
					<input type="hidden" name="id" value={orderId} />
					<input type="hidden" name="trackingUrl" value={trackingUrl} />
					<input type="hidden" name="sendEmail" value={sendEmail ? "true" : "false"} />

					<FormServerErrorAlert errors={serverErrors} />

					<RequiredFieldsNote />

					<div className="space-y-4">
						{/* Tracking Number Field */}
						<div className="space-y-2">
							<FieldLabel htmlFor="trackingNumber" required>
								Numéro de suivi
							</FieldLabel>
							<Input
								id="trackingNumber"
								name="trackingNumber"
								value={trackingNumber}
								onChange={handleTrackingNumberChange}
								placeholder="Ex: 8N00234567890"
								disabled={isPending}
								maxLength={TRACKING_NUMBER_MAX_LENGTH}
								required
							/>
							<p className="text-muted-foreground text-xs">
								Le transporteur sera détecté automatiquement selon le format du numéro
							</p>
						</div>

						{/* Carrier Field */}
						<div className="space-y-2">
							<FieldLabel htmlFor="carrier" required>
								Transporteur
							</FieldLabel>
							<Select
								value={carrier}
								onValueChange={(value) => handleCarrierChange(value as Carrier)}
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
							{trackingNumber.length >= 8 &&
								!customUrlMode &&
								carrier !== "" &&
								carrier !== "autre" && (
									<p className="text-success text-xs">
										Détecté automatiquement : {CARRIERS.find((c) => c.value === carrier)?.label}
									</p>
								)}
						</div>

						{/* Tracking URL */}
						<div className="space-y-2">
							<Label htmlFor="trackingUrlDisplay">
								URL de suivi {isUrlEditable ? "" : "(générée)"}
							</Label>
							<Input
								id="trackingUrlDisplay"
								value={trackingUrl}
								onChange={(e) => form.setFieldValue("trackingUrl", e.target.value)}
								readOnly={!isUrlEditable}
								placeholder={isUrlEditable ? "https://..." : ""}
								className={!isUrlEditable ? "bg-muted text-muted-foreground text-sm" : ""}
								disabled={isPending}
							/>
							{carrier === "autre" && !trackingUrl && (
								<p className="text-warning text-xs">
									Saisissez l'URL de suivi manuellement pour ce transporteur
								</p>
							)}
						</div>

						{/* Custom URL Mode Checkbox */}
						<div className="bg-muted/20 flex items-start gap-x-3 rounded-lg border p-3">
							<Checkbox
								id="customUrlMode"
								checked={customUrlMode}
								onCheckedChange={(checked) => form.setFieldValue("customUrlMode", checked === true)}
								disabled={isPending}
							/>
							<div className="space-y-1 leading-none">
								<Label
									htmlFor="customUrlMode"
									className="flex cursor-pointer items-center gap-2 text-sm"
								>
									<LinkIcon className="size-4" />
									URL personnalisée
								</Label>
								<p className="text-muted-foreground text-xs">Saisir manuellement l'URL de suivi</p>
							</div>
						</div>

						{/* Send Email Checkbox */}
						<div className="bg-muted/30 flex items-start gap-x-3 rounded-lg border p-4">
							<Checkbox
								id="sendEmailCheckbox"
								checked={sendEmail}
								onCheckedChange={(checked) => form.setFieldValue("sendEmail", checked === true)}
								disabled={isPending}
							/>
							<div className="space-y-1 leading-none">
								<Label
									htmlFor="sendEmailCheckbox"
									className="flex cursor-pointer items-center gap-2"
								>
									<EnvelopeIcon className="size-4" />
									Envoyer l'email de confirmation
								</Label>
								<p className="text-muted-foreground text-xs">
									Un email avec le numéro de suivi sera envoyé au client
								</p>
							</div>
						</div>
					</div>

					{/* Submit buttons */}
					<ResponsiveDialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
							Annuler
						</Button>
						<Button
							type="submit"
							disabled={isPending || !trackingNumber.trim() || !carrier}
							aria-busy={isPending}
						>
							{isPending && <Spinner presentational />}
							{isPending ? "Expédition…" : "Valider l'expédition"}
						</Button>
					</ResponsiveDialogFooter>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

export function MarkAsShippedDialog() {
	const dialog = useAlertDialog<MarkAsShippedData>(MARK_AS_SHIPPED_DIALOG_ID);

	// `closeEntry` CONSERVE la `data` à la fermeture (elle n'est vidée que par
	// `clearData`) : monter sur `data` plutôt que sur `isOpen` garde donc
	// l'animation de sortie, tout en remontant le formulaire à chaque commande.
	if (!dialog.data) return null;

	return (
		<MarkAsShippedFormContent
			key={dialog.data.orderId}
			orderId={dialog.data.orderId}
			orderNumber={dialog.data.orderNumber}
			open={dialog.isOpen}
			onClose={dialog.close}
		/>
	);
}
