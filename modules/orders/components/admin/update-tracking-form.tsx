"use client";

/**
 * Formulaire de mise a jour du suivi (tracking number, carrier, URL).
 *
 * Pattern dual : utilise en dialog modal (`update-tracking-dialog.tsx`)
 * ET en page inline (`app/admin/ventes/commandes/[id]/suivi/page.tsx`).
 * Cf. ORD-MAP-002.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form";
import { CheckCircle2, ExternalLink, Link2, Loader2, Mail } from "lucide-react";

import { CARRIERS, detectCarrierAndUrl, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { useUpdateTrackingForm } from "@/modules/orders/hooks/use-update-tracking-form";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { CopyButton } from "@/shared/components/copy-button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Kbd } from "@/shared/components/ui/kbd";
import { Label } from "@/shared/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface UpdateTrackingFormProps {
	orderId: string;
	orderNumber: string;
	initialTrackingNumber?: string;
	initialTrackingUrl?: string;
	initialCarrier?: Carrier;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

const CARRIER_PLACEHOLDERS: Record<Carrier, string> = {
	colissimo: "Ex : 8N00234567890",
	lettre_suivie: "Ex : 1A12345678901",
	mondial_relay: "Ex : 12345678",
	chronopost: "Ex : XX123456789YY",
	dpd: "Ex : 0123456789012345",
	gls: "Ex : 12345678901234",
	dhl: "Ex : 1234567890",
	ups: "Ex : 1Z9999W99999999999",
	fedex: "Ex : 999999999999",
	relais_colis: "Ex : XYZ12345678",
	autre: "Numéro de suivi",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function UpdateTrackingForm({
	orderId,
	orderNumber,
	initialTrackingNumber,
	initialTrackingUrl,
	initialCarrier,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: UpdateTrackingFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);
	const previousCarrierRef = useRef<Carrier | undefined>(initialCarrier);

	const { form, action, isPending } = useUpdateTrackingForm({
		orderId,
		initialTrackingNumber,
		initialTrackingUrl,
		initialCarrier,
		onSuccess: () => {
			haptic("success");
			allowNavigationRef.current?.();
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				navigateWithTransition(router, successPath);
			}
		},
	});

	const trackingNumber = useStore(form.store, (state) => state.values.trackingNumber);
	const carrier = useStore(form.store, (state) => state.values.carrier);
	const trackingUrl = useStore(form.store, (state) => state.values.trackingUrl);
	const sendEmail = useStore(form.store, (state) => state.values.sendEmail);
	const customUrlMode = useStore(form.store, (state) => state.values.customUrlMode);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	const isUrlEditable = customUrlMode || carrier === "autre";

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (carrier !== previousCarrierRef.current) {
			previousCarrierRef.current = carrier;
			haptic("selection");
		}
	}, [carrier, haptic]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending || !trackingNumber.trim()) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, trackingNumber, formRef, haptic]);

	useEffect(() => {
		if (isMobile || !successPath) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[role='dialog']",
				)
			) {
				return;
			}
			if (
				isDirty &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			allowNavigation();
			navigateWithTransition(router, successPath);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isDirty, haptic, router, allowNavigation, successPath]);

	const handleTrackingNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		form.setFieldValue("trackingNumber", value);

		if (value.length >= 8 && value !== initialTrackingNumber && !customUrlMode) {
			const detection = detectCarrierAndUrl(value);
			form.setFieldValue("carrier", detection.carrier);
			if (detection.url) {
				form.setFieldValue("trackingUrl", detection.url);
			}
		}
	};

	const handleCarrierChange = (value: Carrier) => {
		form.setFieldValue("carrier", value);

		if (!customUrlMode && trackingNumber.length >= 8) {
			if (value !== "autre") {
				const { url } = detectCarrierAndUrl(trackingNumber);
				if (url) {
					form.setFieldValue("trackingUrl", url);
				}
			} else {
				form.setFieldValue("trackingUrl", "");
			}
		}
	};

	const wasAutoDetected =
		trackingNumber.length >= 8 &&
		trackingNumber !== initialTrackingNumber &&
		!customUrlMode &&
		carrier !== "autre";

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de mise à jour du suivi"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!event.currentTarget.checkValidity()) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={orderId} />
			<input type="hidden" name="trackingUrl" value={trackingUrl} />
			<input type="hidden" name="sendEmail" value={sendEmail ? "true" : "false"} />

			<p className="text-muted-foreground text-sm">
				Commande <span className="text-foreground font-semibold">{orderNumber}</span>
			</p>

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="trackingNumber">
						Numéro de suivi <span className="text-destructive">*</span>
					</Label>
					<Input
						id="trackingNumber"
						name="trackingNumber"
						value={trackingNumber}
						onChange={handleTrackingNumberChange}
						placeholder={CARRIER_PLACEHOLDERS[carrier]}
						autoCapitalize="characters"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="next"
						required
					/>
					<p className="text-muted-foreground text-xs">
						Le transporteur sera détecté automatiquement selon le format du numéro.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="carrier">Transporteur</Label>
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
					{wasAutoDetected && (
						<p className="flex items-center gap-1.5 text-xs text-emerald-600">
							<CheckCircle2 className="size-3.5" aria-hidden="true" />
							<span>
								Détecté automatiquement : {CARRIERS.find((c) => c.value === carrier)?.label}
							</span>
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="trackingUrlDisplay">
						URL de suivi {isUrlEditable ? "" : "(générée)"}
					</Label>
					<div className="flex items-center gap-1.5">
						<Input
							id="trackingUrlDisplay"
							value={trackingUrl}
							onChange={(e) => form.setFieldValue("trackingUrl", e.target.value)}
							readOnly={!isUrlEditable}
							placeholder={isUrlEditable ? "https://…" : ""}
							className={cn("flex-1", !isUrlEditable && "bg-muted text-muted-foreground text-sm")}
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
						/>
						{trackingUrl && (
							<>
								<CopyButton
									text={trackingUrl}
									label="URL de suivi"
									size="icon"
									className="h-9 w-9 shrink-0"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									asChild
									className="h-9 w-9 shrink-0"
								>
									<a
										href={trackingUrl}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Tester l'URL de suivi dans un nouvel onglet"
									>
										<ExternalLink className="size-4" aria-hidden="true" />
									</a>
								</Button>
							</>
						)}
					</div>
					{carrier === "autre" && !trackingUrl && (
						<p className="text-xs text-amber-600">
							Saisissez l&apos;URL de suivi manuellement pour ce transporteur.
						</p>
					)}
				</div>

				<div className="bg-muted/20 flex items-start gap-x-3 rounded-lg border p-3">
					<Checkbox
						id="customUrlMode"
						checked={customUrlMode}
						onCheckedChange={(checked) => form.setFieldValue("customUrlMode", checked === true)}
						disabled={isPending}
						className="touch-manipulation"
					/>
					<div className="space-y-1 leading-none">
						<Label
							htmlFor="customUrlMode"
							className="flex cursor-pointer items-center gap-2 text-sm"
						>
							<Link2 className="size-4" aria-hidden="true" />
							URL personnalisée
						</Label>
						<p className="text-muted-foreground text-xs">
							Saisir manuellement l&apos;URL de suivi.
						</p>
					</div>
				</div>

				<div className="bg-muted/30 flex items-start gap-x-3 rounded-lg border p-4">
					<Checkbox
						id="sendEmailCheckbox"
						checked={sendEmail}
						onCheckedChange={(checked) => form.setFieldValue("sendEmail", checked === true)}
						disabled={isPending}
						className="touch-manipulation"
					/>
					<div className="space-y-1 leading-none">
						<Label htmlFor="sendEmailCheckbox" className="flex cursor-pointer items-center gap-2">
							<Mail className="size-4" aria-hidden="true" />
							Prévenir le client par email
						</Label>
						<p className="text-muted-foreground text-xs">
							On envoie un email avec le numéro et le lien de suivi.
						</p>
					</div>
				</div>
			</fieldset>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<Button
						type="submit"
						size="input"
						disabled={isPending || !trackingNumber.trim()}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>
							{isPending ? (sendEmail ? "Envoi…" : "Mise à jour…") : "Enregistrer le suivi"}
						</span>
						{!isPending && (
							<Kbd
								aria-hidden="true"
								className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
							>
								⌘S
							</Kbd>
						)}
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
