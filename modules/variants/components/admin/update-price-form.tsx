"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form-nextjs";
import { Spinner } from "@/shared/components/ui/spinner";

import { useUpdateVariantPrice } from "@/modules/variants/hooks/use-update-variant-price";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon } from "@/shared/components/ui/input-group";
import { Kbd } from "@/shared/components/ui/kbd";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

interface UpdatePriceFormProps {
	variantId: string;
	variantName: string;
	/** Override de prix EN CENTIMES, ou `null` si la variante suit le produit. */
	priceCents: number | null;
	/** Prix du produit parent en centimes — ce que vaut la variante sans override. */
	productPriceCents: number;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

/**
 * Les défauts sont des strings `.toFixed(2)` (affichage "50.00") tandis que
 * `InputGroupField type="number"` renvoie `number | null` après édition.
 */
type PriceFieldValue = string | number | null;

/** Parse une valeur de champ (string des défauts ou number TanStack) en nombre, sinon null. */
function toNumber(value: PriceFieldValue): number | null {
	if (value === null || value === "") return null;
	const parsed = typeof value === "number" ? value : parseFloat(value);
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Formulaire d'override de prix d'une variante.
 *
 * ⚠️ Le champ s'ouvre sur l'OVERRIDE (`priceCents`), jamais sur le prix effectif :
 * pré-remplir le prix hérité du produit transformait « ouvrir puis enregistrer »
 * en épinglage silencieux d'un override — et il n'existait alors plus aucun geste
 * pour revenir à l'héritage. Vider le champ RETIRE l'override, c'est la sémantique
 * de `updateVariantPriceSchema` côté serveur.
 */
export function UpdatePriceForm({
	variantId,
	variantName,
	priceCents,
	productPriceCents,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: UpdatePriceFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const formRef = useRef<HTMLFormElement>(null);

	const initialPrice = priceCents !== null ? (priceCents / 100).toFixed(2) : "";

	const { updatePrice, isPending, state } = useUpdateVariantPrice({
		onSuccess: () => {
			// Libère la garde : les champs restent « dirty » vis-à-vis des props jusqu'à
			// la revalidation, mais la navigation de succès ne doit pas être bloquée.
			allowNavigation();
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				setTimeout(
					() => router.push(successPath, PAGE_FADE_NAVIGATION),
					FORM_SUCCESS_REDIRECT_DELAY_MS,
				);
			}
		},
	});

	const serverErrors = useServerFieldErrors({ state });

	const form = useAppForm({
		defaultValues: {
			price: initialPrice as PriceFieldValue,
		},
	});

	const price = useStore(form.store, (s) => s.values.price);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	const priceValue = toNumber(price);
	// Champ vide = retrait volontaire de l'override : c'est une soumission VALIDE.
	const isValid = priceValue === null || priceValue > 0;

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending);

	// `listPath` seulement en plein écran : en dialogue, Échap doit fermer la modale,
	// pas naviguer vers la variante.
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: redirectOnSuccess ? successPath : undefined,
		allowNavigation,
		getIsDirty: () => isDirty,
		getCanSubmit: () => isValid,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid) return;
		updatePrice(variantId, priceValue);
	};

	return (
		<form ref={formRef} onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">{variantName}</span>
			</p>

			<FormServerErrorAlert errors={serverErrors} />

			<form.AppField name="price">
				{(field) => (
					<field.InputGroupField
						label="Prix de la variante (€)"
						type="number"
						step="0.01"
						min="0.01"
						placeholder="Laisser vide pour suivre le prix du produit"
						disabled={isPending}
						className="text-lg font-semibold"
					>
						<InputGroupAddon align="inline-end">€</InputGroupAddon>
					</field.InputGroupField>
				)}
			</form.AppField>

			<p className="text-muted-foreground text-xs">
				{priceValue === null
					? `Champ vide : la variante suit le prix du produit (${formatEuro(productPriceCents)}).`
					: `Vide le champ pour revenir au prix du produit (${formatEuro(productPriceCents)}).`}
			</p>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<Button
						type="submit"
						disabled={!isValid || isPending}
						aria-busy={isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && <Spinner presentational />}
						<span>{isPending ? "Enregistrement…" : "Enregistrer"}</span>
						{!isPending && (
							<Kbd className="ml-2 hidden lg:inline-flex" aria-hidden="true">
								⌘S
							</Kbd>
						)}
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
