"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUpdateOrderShippingAddress } from "@/modules/orders/hooks/use-update-order-shipping-address";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
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
import { COUNTRY_NAMES, SORTED_SHIPPING_COUNTRIES } from "@/shared/constants/countries";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface EditShippingAddressFormProps {
	orderId: string;
	orderNumber: string;
	shippingFirstName: string;
	shippingLastName: string;
	shippingAddress1: string;
	shippingAddress2?: string | null;
	shippingPostalCode: string;
	shippingCity: string;
	shippingCountry: string;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditShippingAddressForm({
	orderId,
	orderNumber,
	shippingFirstName,
	shippingLastName,
	shippingAddress1,
	shippingAddress2,
	shippingPostalCode,
	shippingCity,
	shippingCountry,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: EditShippingAddressFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const [isDirty, setIsDirty] = useState(false);
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { action, isPending } = useUpdateOrderShippingAddress(() => {
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

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'adresse de livraison"
			className={cn("space-y-6", className)}
			onChange={() => {
				if (!isDirty) setIsDirty(true);
			}}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!event.currentTarget.checkValidity()) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={orderId} />

			<p className="text-muted-foreground text-sm">
				Commande <span className="text-foreground font-semibold">{orderNumber}</span> — correction
				de l&apos;adresse de livraison. Bloqué dès que la commande passe en expédition.
			</p>

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-4">
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
							autoCapitalize="words"
							enterKeyHint="next"
							required
							maxLength={50}
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
							autoCapitalize="words"
							enterKeyHint="next"
							required
							maxLength={50}
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
						autoCapitalize="words"
						enterKeyHint="next"
						required
						maxLength={255}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="shippingAddress2">Complément d&apos;adresse</Label>
					<Input
						id="shippingAddress2"
						name="shippingAddress2"
						type="text"
						defaultValue={shippingAddress2 ?? ""}
						autoComplete="address-line2"
						autoCapitalize="sentences"
						enterKeyHint="next"
						maxLength={255}
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
							autoComplete="postal-code"
							autoCorrect="off"
							spellCheck={false}
							enterKeyHint="next"
							defaultValue={shippingPostalCode}
							required
							maxLength={10}
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
							autoCapitalize="words"
							enterKeyHint="next"
							required
							maxLength={100}
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
			</fieldset>

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
