"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleVariants } from "@/modules/variants/services/variant-filter.service";
import type { VariantSelectors } from "@/modules/variants/types/variant.types";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useTransition, type ReactNode } from "react";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { m, useReducedMotion } from "motion/react";

export interface VariantOption {
	/** Valeur écrite dans l'URL et comparée aux variantes. */
	id: string;
	label: string;
}

interface VariantOptionGroupProps {
	/** Libellé du groupe (`<legend>`). */
	legend: string;
	/** Nom du paramètre d'URL piloté par ce groupe (`size`, `material`…). */
	paramName: string;
	options: VariantOption[];
	product: GetProductReturn;
	/** Valeur de repli quand l'URL est muette (variante par défaut de la fiche). */
	fallbackValue?: string | null;
	/** Sélecteurs à tester pour savoir si une option reste achetable. */
	buildSelectors: (optionId: string) => VariantSelectors;
	/**
	 * `tile` : grille de pastilles centrées (tailles) — `row` : lignes libellé +
	 * coche (matériaux). C'est la SEULE différence de rendu entre les deux
	 * sélecteurs, et la raison d'être de ce composant plutôt que d'un pass-through.
	 */
	layout: "tile" | "row";
	/** Action rendue à droite de la légende (le guide des tailles, par exemple). */
	headerAction?: ReactNode;
	/** Libellé accessible d'une option (« Taille 52 », « Acier »). */
	getOptionAriaLabel?: (option: VariantOption) => string;
}

/**
 * Groupe d'options de variante piloté par l'URL (radiogroup ARIA).
 *
 * ⚠️ Ce composant est l'unique implémentation de ce comportement. `size-selector`
 * et `material-selector` en portaient chacun leur copie — 420 lignes pour la même
 * mécanique (lecture d'URL, garde d'URL périmée, état optimiste, calcul de
 * disponibilité, navigation clavier, bouton de réinitialisation), au mot près
 * jusqu'aux commentaires. Une correction d'a11y sur l'un ne suivait pas sur l'autre :
 * c'est exactement ce qui s'est produit le 2026-08-05 avec la traversée au clavier
 * des options indisponibles.
 *
 * A11y : le focus TRAVERSE les options indisponibles pour qu'un lecteur d'écran
 * les annonce (WCAG 1.3.1) ; la mutation, elle, reste bloquée par le garde de
 * disponibilité — d'où `aria-disabled` et non `disabled`.
 */
export function VariantOptionGroup({
	legend,
	paramName,
	options,
	product,
	fallbackValue,
	buildSelectors,
	layout,
	headerAction,
	getOptionAriaLabel,
}: VariantOptionGroupProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();
	const legendId = useId();

	// Comparaison INSENSIBLE À LA CASSE, comme `matchSize` / `matchMaterial` :
	// la casse ne porte aucune identité.
	const isSameValue = (a: string | null | undefined, b: string | null | undefined) =>
		a != null && b != null && a.toLowerCase() === b.toLowerCase();

	// L'URL est la source de vérité, avec repli sur la variante par défaut.
	const rawValue = searchParams.get(paramName) ?? fallbackValue ?? null;
	// Garde d'URL périmée : une valeur retirée du catalogue (marque-page, partage)
	// ne doit pas laisser l'UI en « aucune option » alors que la query dit l'inverse.
	const currentValue =
		rawValue && options.some((option) => isSameValue(option.id, rawValue)) ? rawValue : null;

	const [optimisticValue, setOptimisticValue] = useOptimistic(currentValue);

	const isOptionAvailable = (optionId: string): boolean =>
		filterCompatibleVariants(product, buildSelectors(optionId)).length > 0;

	const updateValue = (value: string | null) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticValue(value);
			const params = new URLSearchParams(searchParams.toString());
			if (value) params.set(paramName, value);
			else params.delete(paramName);
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	const { containerRef, handleKeyDown, getTabIndex } = useRadioGroupKeyboard({
		options,
		getOptionId: (option: VariantOption) => option.id,
		onSelect: (option: VariantOption) => {
			if (isOptionAvailable(option.id)) updateValue(option.id);
		},
		// Un seul arrêt de tabulation pour le groupe (ARIA APG) : les options
		// indisponibles se rejoignent aux flèches.
		activeOptionId: optimisticValue,
	});

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending || undefined}
			className="space-y-3"
		>
			{/* Pas d'`aria-label` sur le `fieldset` : il écraserait la `<legend>`. */}
			<div className="flex items-center justify-between">
				<legend id={legendId} className="text-sm/6 font-semibold tracking-tight antialiased">
					{legend}
				</legend>
				<div className="flex items-center gap-2">
					{headerAction}
					{optimisticValue ? (
						<Button
							variant="ghost"
							size="sm"
							aria-busy={isPending || undefined}
							className="text-muted-foreground text-xs/5 tracking-normal antialiased aria-busy:opacity-70"
							onClick={() => updateValue(null)}
							type="button"
						>
							Réinitialiser
						</Button>
					) : null}
				</div>
			</div>
			<div
				ref={containerRef}
				role="radiogroup"
				aria-labelledby={legendId}
				className={cn(
					"grid gap-2",
					layout === "tile"
						? "xs:grid-cols-3 grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2"
						: "grid-cols-2",
				)}
			>
				{options.map((option, index) => {
					const isSelected = isSameValue(option.id, optimisticValue);
					const isAvailable = isOptionAvailable(option.id);

					return (
						<button
							key={option.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-disabled={!isAvailable}
							aria-label={`${getOptionAriaLabel?.(option) ?? option.label}${
								!isAvailable ? " (indisponible)" : ""
							}`}
							data-option-id={option.id}
							tabIndex={getTabIndex(option, index)}
							onClick={() => {
								if (!isAvailable) return;
								updateValue(option.id);
							}}
							onKeyDown={(event) => handleKeyDown(event, index)}
							className={cn(
								"relative flex min-h-13 items-center border transition-all sm:min-h-11",
								"can-hover:hover:shadow-sm",
								"aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:saturate-50",
								layout === "tile"
									? "justify-center rounded-xl border-2 p-3 text-center active:scale-[0.98] sm:rounded-lg sm:p-2.5"
									: "justify-between rounded-lg p-3 text-left active:scale-95",
								// Rose PROFOND, pas `--primary` (1,6:1 sur la carte) : la bordure porte
								// l'état « sélectionné », WCAG 1.4.11 demande 3:1 pour un composant.
								// Arbitrage déjà tranché dans `shared/components/ui/radio-group.tsx`.
								isSelected
									? "border-brand-rose-strong bg-primary/5"
									: "border-border can-hover:hover:border-brand-rose-strong",
							)}
						>
							<span className="text-sm/6 font-medium tracking-normal antialiased">
								{option.label}
							</span>
							{isSelected && (
								<m.div
									initial={shouldReduceMotion ? {} : { scale: 0 }}
									animate={{ scale: 1 }}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: { type: "spring", stiffness: 400, damping: 15 }
									}
									className={cn(layout === "tile" && "absolute top-1.5 right-1.5")}
								>
									<CheckIcon
										className={cn(
											"text-brand-rose-strong",
											layout === "tile" ? "h-3.5 w-3.5" : "h-4 w-4",
										)}
										aria-hidden="true"
									/>
								</m.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
