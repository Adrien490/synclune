"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@tanstack/react-form-nextjs";
import { Spinner } from "@/shared/components/ui/spinner";

import { useUpdateSkuPrice } from "@/modules/skus/hooks/use-update-sku-price";
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
import { withViewTransition } from "@/shared/utils/view-transition";

const COMPARE_AT_PRICE_ERROR = "Le prix barré doit être supérieur au prix de vente";

interface UpdatePriceFormProps {
	skuId: string;
	skuName: string;
	currentPrice: number;
	currentCompareAtPrice: number | null;
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

function toEuros(cents: number | null): string {
	return cents ? (cents / 100).toFixed(2) : "";
}

/** Parse une valeur de champ (string des défauts ou number TanStack) en nombre, sinon null. */
function toNumber(value: PriceFieldValue): number | null {
	if (value === null || value === "") return null;
	const parsed = typeof value === "number" ? value : parseFloat(value);
	return Number.isNaN(parsed) ? null : parsed;
}

export function UpdatePriceForm({
	skuId,
	skuName,
	currentPrice,
	currentCompareAtPrice,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: UpdatePriceFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const formRef = useRef<HTMLFormElement>(null);

	const initialPrice = (currentPrice / 100).toFixed(2);
	const initialCompareAtPrice = toEuros(currentCompareAtPrice);

	const { updatePrice, isPending, state } = useUpdateSkuPrice({
		onSuccess: () => {
			// Libère la garde : les champs restent « dirty » vis-à-vis des props jusqu'à
			// la revalidation, mais la navigation de succès ne doit pas être bloquée.
			allowNavigation();
			onSuccess?.();
			if (redirectOnSuccess && successPath) {
				setTimeout(
					() => withViewTransition(() => router.push(successPath)),
					FORM_SUCCESS_REDIRECT_DELAY_MS,
				);
			}
		},
	});

	const serverErrors = useServerFieldErrors({ state });

	const form = useAppForm({
		defaultValues: {
			price: initialPrice as PriceFieldValue,
			compareAtPrice: initialCompareAtPrice as PriceFieldValue,
		},
	});

	const price = useStore(form.store, (s) => s.values.price);
	const compareAtPrice = useStore(form.store, (s) => s.values.compareAtPrice);
	const isDirty = useStore(form.store, (s) => s.isDirty);

	const priceValue = toNumber(price) ?? 0;
	const compareAtPriceValue = toNumber(compareAtPrice) ?? 0;
	const hasCompareAtPrice = compareAtPrice !== null && compareAtPrice !== "";
	const isValid = priceValue > 0 && (!hasCompareAtPrice || compareAtPriceValue > priceValue);

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
		const priceInEuros = toNumber(price);
		const compareAtPriceInEuros = hasCompareAtPrice ? toNumber(compareAtPrice) : null;
		if (priceInEuros === null || priceInEuros <= 0) return;
		updatePrice(skuId, skuName, priceInEuros, compareAtPriceInEuros);
	};

	return (
		<form ref={formRef} onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<p className="text-muted-foreground text-sm">
				Variante <span className="text-foreground font-semibold">{skuName}</span>
			</p>

			<FormServerErrorAlert errors={serverErrors} />

			<form.AppField name="price">
				{(field) => (
					<field.InputGroupField
						label="Prix final (€)"
						type="number"
						step="0.01"
						min="0.01"
						disabled={isPending}
						className="text-lg font-semibold"
					>
						<InputGroupAddon align="inline-end">€</InputGroupAddon>
					</field.InputGroupField>
				)}
			</form.AppField>

			<form.AppField
				name="compareAtPrice"
				validators={{
					onChangeListenTo: ["price"],
					onChange: ({ value, fieldApi }) => {
						const compareAt = toNumber(value);
						if (compareAt === null) return undefined;
						const priceInEuros = toNumber(fieldApi.form.getFieldValue("price"));
						return priceInEuros !== null && compareAt <= priceInEuros
							? COMPARE_AT_PRICE_ERROR
							: undefined;
					},
				}}
			>
				{(field) => (
					<field.InputGroupField
						label="Prix barré (optionnel)"
						type="number"
						step="0.01"
						min="0"
						placeholder="Laisser vide pour aucun"
						disabled={isPending}
					>
						<InputGroupAddon align="inline-end">€</InputGroupAddon>
					</field.InputGroupField>
				)}
			</form.AppField>

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
