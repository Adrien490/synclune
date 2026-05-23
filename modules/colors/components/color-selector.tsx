"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import { buildComboKey } from "@/modules/skus/services/sku-info-extraction.service";
import { buildSwatchStyle, areAllColorsLight } from "@/modules/colors/utils/swatch-style";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import type { ColorCombo } from "@/shared/types/product-sku.types";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import type { Color } from "@/modules/skus/types/sku-selector.types";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { m, useReducedMotion } from "motion/react";

interface ColorSelectorProps {
	/**
	 * Combinaisons de couleurs M2M extraites du produit. Chaque pastille = une
	 * variante (mono ou multi). Pilote l'URL via `?variant=<comboKey>` (slugs
	 * triés alphabétiquement, séparés par `__`), rend des pastilles split-gradient
	 * (linear/conic) pour les SKUs multi-couleur.
	 */
	combos: ColorCombo[];
	product: GetProductReturn;
	showMaterialLabel?: boolean;
	defaultSku?: ProductSku;
	/**
	 * @deprecated Mode legacy retiré (M2M depuis 2026-05-15). Conservé pour
	 * compatibilité de l'appelant `sku-selector.tsx` mais non utilisé.
	 */
	colors?: Color[];
}

/**
 * Sélecteur de couleur — variantes M2M (mono ou multi-couleur).
 *
 * - Pilote l'URL via `?variant=<comboKey>`. Compatible rétro `?color=<slug>`
 *   dérivé au mount (cf. liens partagés/anciens bookmarks).
 * - Normalise un `?variant=` stale (combo retiré du catalogue) vers le
 *   defaultSku pour éviter un état "rien de sélectionné" silencieux.
 * - Clavier (Arrow/Home/End) : le focus traverse les options indisponibles
 *   (aria-disabled) pour permettre l'annonce SR, mais l'action est bloquée.
 */
function ColorSelectorInner({
	combos,
	product,
	showMaterialLabel = false,
	defaultSku,
}: ColorSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	const defaultComboKey =
		defaultSku && defaultSku.colors.length > 0
			? buildComboKey(defaultSku.colors.map((c) => c.color.slug))
			: null;

	const variantParam = searchParams.get("variant");
	const colorLegacyParam = searchParams.get("color");
	let derivedFromLegacy: string | null = null;
	if (!variantParam && colorLegacyParam) {
		const match = combos.find((c) => c.colors.some((cc) => cc.slug === colorLegacyParam));
		derivedFromLegacy = match?.comboKey ?? null;
	}

	const rawCombo = variantParam ?? derivedFromLegacy ?? defaultComboKey;
	// Garde-fou URL stale : un ?variant=<comboKey> retiré du catalogue (bookmark
	// vieillot, partage social, produit édité) ne doit pas laisser l'UI en état
	// "aucune option" alors que la query string dit l'inverse → fallback default.
	const currentCombo =
		rawCombo && combos.some((c) => c.comboKey === rawCombo) ? rawCombo : defaultComboKey;
	const currentMaterial = searchParams.get("material");
	const currentSize = searchParams.get("size");

	const [optimisticCombo, setOptimisticCombo] = useOptimistic(currentCombo);

	const isComboAvailable = (comboKey: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorCombo: comboKey,
			materialSlug: currentMaterial ?? undefined,
			size: currentSize ?? undefined,
		});
		return compatibleSkus.length > 0;
	};

	const prefetchComboImage = (comboKey: string) => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorCombo: comboKey,
			materialSlug: currentMaterial ?? undefined,
			size: currentSize ?? undefined,
		});
		const primaryImage = compatibleSkus[0]?.images[0];
		if (!primaryImage?.url) return;
		if (document.querySelector(`link[href="${primaryImage.url}"]`)) return;
		const link = document.createElement("link");
		link.rel = "prefetch";
		link.as = "image";
		link.href = primaryImage.url;
		document.head.appendChild(link);
	};

	const updateCombo = (comboKey: string | null) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticCombo(comboKey);
			const params = new URLSearchParams(searchParams.toString());
			if (comboKey) {
				params.set("variant", comboKey);
			} else {
				params.delete("variant");
			}
			// Toujours nettoyer l'ancien ?color= pour éviter une double source de vérité
			params.delete("color");
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: combos,
		getOptionId: (combo) => combo.comboKey,
		// Pas de gate `isOptionDisabled` ici : on laisse le focus traverser les
		// options indisponibles pour qu'elles soient annoncées par les lecteurs
		// d'écran (cf. WCAG 1.3.1). La mutation d'URL reste bloquée par le guard
		// `isComboAvailable` ci-dessous + le no-op `onClick` côté bouton.
		onSelect: (combo) => {
			if (isComboAvailable(combo.comboKey)) updateCombo(combo.comboKey);
		},
	});

	if (combos.length === 0) {
		return (
			<div role="status" className="sr-only">
				Aucune couleur disponible
			</div>
		);
	}

	const currentLabel = combos.find((c) => c.comboKey === optimisticCombo)?.label ?? null;

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending || undefined}
			className="space-y-3"
			aria-label="Sélection de la variante"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{showMaterialLabel ? "Couleur / Matériau" : "Couleur"}
					{currentLabel && (
						<span className="text-muted-foreground ml-1 font-normal">: {currentLabel}</span>
					)}
				</legend>
				{optimisticCombo && (
					<Button
						variant="ghost"
						size="sm"
						aria-busy={isPending || undefined}
						className="text-muted-foreground text-xs/5 tracking-normal antialiased aria-busy:opacity-70"
						onClick={() => updateCombo(null)}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div ref={containerRef} className="flex flex-wrap gap-3">
				{combos.map((combo, index) => {
					const isSelected = combo.comboKey === optimisticCombo;
					const isAvailable = isComboAvailable(combo.comboKey);
					const isMulti = combo.hexes.length > 1;
					const allLight = areAllColorsLight(combo.hexes, (hex) => isLightColor(hex, 0.85));

					return (
						<button
							key={combo.comboKey}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-disabled={!isAvailable}
							aria-label={`${combo.ariaLabel}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={combo.comboKey}
							onClick={() => {
								if (!isAvailable) return;
								updateCombo(combo.comboKey);
							}}
							onKeyDown={(e) => handleKeyDown(e, index)}
							onPointerEnter={(e) => {
								// Ignorer les pointeurs tactiles : `onPointerEnter` est déclenché
								// au premier touch en mobile (spec Pointer Events) → un simple
								// scroll par-dessus la grille générerait des prefetch inutiles.
								if (e.pointerType !== "mouse") return;
								if (!isAvailable || isSelected) return;
								prefetchComboImage(combo.comboKey);
							}}
							className={cn(
								"group relative flex min-h-13 items-center gap-2.5 rounded-xl border-2 p-3.5 transition-all sm:min-h-11 sm:rounded-lg sm:p-3",
								"hover:shadow-sm active:scale-[0.98]",
								"aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:saturate-50",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
							)}
						>
							<div
								className={cn(
									"border-background shrink-0 rounded-full border-2 shadow-sm",
									// Taille un cran plus grande pour les combos multi (lisibilité gradient)
									isMulti ? "h-10 w-10 sm:h-9 sm:w-9" : "h-8 w-8 sm:h-7 sm:w-7",
									allLight && "ring-border/30 ring-1",
								)}
								style={{
									...buildSwatchStyle(combo.hexes),
									// View Transition : morphing depuis la pastille de la ProductCard
									// (même comboKey) vers cette pastille au moment du navigate.
									viewTransitionName: `variant-pill-${combo.comboKey}`,
								}}
								aria-hidden="true"
							/>
							<div className="text-left">
								<span className="text-sm/6 font-medium tracking-normal antialiased">
									{combo.label}
								</span>
								{!isAvailable && (
									<p className="text-muted-foreground text-xs/5 tracking-normal antialiased">
										Indisponible
									</p>
								)}
							</div>
							{isSelected && (
								<m.div
									initial={shouldReduceMotion ? {} : { scale: 0.85 }}
									animate={{ scale: 1 }}
									transition={
										shouldReduceMotion
											? { duration: 0 }
											: { type: "spring", stiffness: 400, damping: 15 }
									}
								>
									<Check className="text-primary ml-auto h-4 w-4" aria-hidden="true" />
								</m.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

export function ColorSelector(props: ComponentProps<typeof ColorSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<ColorSelectorInner {...props} />
		</Suspense>
	);
}
