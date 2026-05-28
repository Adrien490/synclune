"use client";

/**
 * Formulaire d'edition de l'adresse de facturation.
 *
 * Pattern dual : utilise en dialog modal
 * (`edit-billing-address-dialog.tsx`) ET en page inline
 * (`app/admin/ventes/commandes/[id]/adresse-facturation/page.tsx`).
 *
 * Le gate `InvoiceStatus` (interdit si facture GENERATED) est applique
 * cote page inline (redirect notFound) ET cote Server Action
 * `updateOrderBillingAddress`. Toute modification de la regle doit etre
 * faite des deux cotes. Cf. ORD-MAP-002.
 */
import { Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUpdateOrderBillingAddress } from "@/modules/orders/hooks/use-update-order-billing-address";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { COUNTRY_NAMES, SORTED_SHIPPING_COUNTRIES } from "@/shared/constants/countries";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface EditBillingAddressFormProps {
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
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditBillingAddressForm({
	orderId,
	orderNumber,
	billingSameAsShipping: initialSameAsShipping,
	billingFirstName,
	billingLastName,
	billingAddress1,
	billingAddress2,
	billingPostalCode,
	billingCity,
	billingCountry,
	billingPhone,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: EditBillingAddressFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const [sameAsShipping, setSameAsShipping] = useState(initialSameAsShipping);
	const [isDirty, setIsDirty] = useState(false);
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { action, isPending } = useUpdateOrderBillingAddress(() => {
		haptic("success");
		allowNavigationRef.current?.();
		setIsDirty(false);
		onSuccess?.();
		if (redirectOnSuccess && successPath) {
			navigateWithTransition(router, successPath);
		}
	});

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, formRef, haptic]);

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

	const markDirty = () => {
		if (!isDirty) setIsDirty(true);
	};

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'adresse de facturation"
			className={cn("space-y-6", className)}
			onChange={markDirty}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!event.currentTarget.checkValidity()) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={orderId} />
			<input type="hidden" name="billingSameAsShipping" value={sameAsShipping ? "true" : "false"} />

			<div className="text-muted-foreground flex items-start gap-2 text-sm">
				<p className="flex-1">
					Commande <span className="text-foreground font-semibold">{orderNumber}</span> — correction
					de l&apos;adresse de facture (avant émission).
				</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label="Informations légales sur la modification d'adresse"
							className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
						>
							<Info className="size-4" aria-hidden="true" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="max-w-xs">
						Article 286 CGI — la facture devient immuable dès son émission. Toute correction doit
						être faite avant.
					</TooltipContent>
				</Tooltip>
			</div>

			<div className="bg-muted/30 flex items-start gap-x-3 rounded-lg border p-3">
				<Checkbox
					id="billingSameAsShipping"
					checked={sameAsShipping}
					onCheckedChange={(checked) => {
						setSameAsShipping(checked === true);
						markDirty();
					}}
					disabled={isPending}
				/>
				<div className="space-y-1 leading-none">
					<Label htmlFor="billingSameAsShipping" className="cursor-pointer text-sm">
						Reprendre l&apos;adresse de livraison
					</Label>
					<p className="text-muted-foreground text-xs">
						La facture utilisera l&apos;adresse de livraison.
					</p>
				</div>
			</div>

			{!sameAsShipping && (
				<>
					<RequiredFieldsNote />

					<fieldset disabled={isPending} className="space-y-4">
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
									autoCapitalize="words"
									enterKeyHint="next"
									required
									maxLength={50}
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
									autoCapitalize="words"
									enterKeyHint="next"
									required
									maxLength={50}
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
								autoCapitalize="words"
								enterKeyHint="next"
								required
								maxLength={255}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="billingAddress2">Complément d&apos;adresse</Label>
							<Input
								id="billingAddress2"
								name="billingAddress2"
								type="text"
								defaultValue={billingAddress2 ?? ""}
								autoComplete="address-line2"
								autoCapitalize="sentences"
								enterKeyHint="next"
								maxLength={255}
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
									autoCorrect="off"
									spellCheck={false}
									enterKeyHint="next"
									required
									maxLength={10}
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
									autoCapitalize="words"
									enterKeyHint="next"
									required
									maxLength={100}
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
								autoCorrect="off"
								spellCheck={false}
								enterKeyHint="done"
								required
								maxLength={20}
								placeholder="06 12 34 56 78"
							/>
						</div>
					</fieldset>
				</>
			)}

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<Button
						type="submit"
						size="input"
						disabled={isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>{isPending ? "Mise à jour…" : "Enregistrer l'adresse"}</span>
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
