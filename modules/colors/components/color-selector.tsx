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
	colors: Color[];
	product: GetProductReturn;
	showMaterialLabel?: boolean;
	defaultSku?: ProductSku;
	/**
	 * Combinaisons de couleurs M2M extraites du produit. Si présent et non vide,
	 * le sélecteur passe en mode « combos » : chaque pastille = une variante
	 * (mono ou multi). Sinon, fallback liste plate `colors[]`.
	 */
	combos?: ColorCombo[];
}

/**
 * Sélecteur de couleur — supporte les variantes M2M multi-couleur.
 *
 * - Mode combos (par défaut quand `combos` non vide) : pilote l'URL via
 *   `?variant=<comboKey>` (slugs triés alphabétiquement, séparés par "__"),
 *   rend des pastilles split-gradient (linear/conic) pour les SKUs multi-couleur.
 * - Mode legacy (fallback produits sans couleurs M2M ou ancien data layer) :
 *   pilote l'URL via `?color=<slug>` avec pastilles mono.
 *
 * L'utilisateur navigue au clavier (Arrow/Home/End), le matching est strict
 * en mode combos (`matchColorCombo`) vs permissif en legacy (`matchColor` any-of).
 */
function ColorSelectorInner({
	colors,
	product,
	showMaterialLabel = false,
	defaultSku,
	combos,
}: ColorSelectorProps) {
	const useCombosMode = (combos?.length ?? 0) > 0;

	if (useCombosMode) {
		return (
			<ColorCombosSelector
				combos={combos!}
				product={product}
				showMaterialLabel={showMaterialLabel}
				defaultSku={defaultSku}
			/>
		);
	}

	return (
		<ColorFlatSelector
			colors={colors}
			product={product}
			showMaterialLabel={showMaterialLabel}
			defaultSku={defaultSku}
		/>
	);
}

// ============================================================================
// Mode combos M2M (SKU keyed-by-combo)
// ============================================================================

interface ColorCombosSelectorProps {
	combos: ColorCombo[];
	product: GetProductReturn;
	showMaterialLabel: boolean;
	defaultSku?: ProductSku;
}

function ColorCombosSelector({
	combos,
	product,
	showMaterialLabel,
	defaultSku,
}: ColorCombosSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	const defaultComboKey =
		defaultSku && defaultSku.colors.length > 0
			? buildComboKey(defaultSku.colors.map((c) => c.color.slug))
			: null;

	// Source de vérité : ?variant=. Si absent et que ?color= legacy est posé, on
	// dérive le combo (le 1er qui contient ce slug, mono prioritaire).
	const variantParam = searchParams.get("variant");
	const colorLegacyParam = searchParams.get("color");
	const derivedFromLegacy = (() => {
		if (variantParam || !colorLegacyParam) return null;
		const match = combos.find((c) => c.colors.some((cc) => cc.slug === colorLegacyParam));
		return match?.comboKey ?? null;
	})();

	const currentCombo = variantParam ?? derivedFromLegacy ?? defaultComboKey;
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
		if (primaryImage?.url) {
			const link = document.createElement("link");
			link.rel = "prefetch";
			link.as = "image";
			link.href = primaryImage.url;
			if (!document.querySelector(`link[href="${primaryImage.url}"]`)) {
				document.head.appendChild(link);
			}
		}
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
		isOptionDisabled: (combo) => !isComboAvailable(combo.comboKey),
		onSelect: (combo) => updateCombo(combo.comboKey),
	});

	const currentLabel = combos.find((c) => c.comboKey === optimisticCombo)?.label ?? null;

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			className="group/color space-y-3"
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
						className="text-muted-foreground text-xs/5 tracking-normal antialiased group-has-[[data-pending]]/color:opacity-70"
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
							aria-label={`${combo.ariaLabel}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={combo.comboKey}
							onClick={() => updateCombo(combo.comboKey)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							onPointerEnter={() =>
								isAvailable && !isSelected && prefetchComboImage(combo.comboKey)
							}
							disabled={!isAvailable}
							className={cn(
								"group relative flex min-h-13 items-center gap-2.5 rounded-xl border-2 p-3.5 transition-all sm:min-h-11 sm:rounded-lg sm:p-3",
								"hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50",
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
									initial={shouldReduceMotion ? {} : { scale: 0 }}
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

// ============================================================================
// Mode legacy (liste plate Color[]) — conservé pour rétro-compat
// ============================================================================

interface ColorFlatSelectorProps {
	colors: Color[];
	product: GetProductReturn;
	showMaterialLabel: boolean;
	defaultSku?: ProductSku;
}

function ColorFlatSelector({
	colors,
	product,
	showMaterialLabel,
	defaultSku,
}: ColorFlatSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	const currentColor = searchParams.get("color") ?? defaultSku?.colors[0]?.color.slug ?? null;
	const currentMaterial = searchParams.get("material");
	const currentSize = searchParams.get("size");

	const [optimisticColor, setOptimisticColor] = useOptimistic(currentColor);

	const isColorAvailable = (colorId: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: colorId,
			materialSlug: currentMaterial ?? undefined,
			size: currentSize ?? undefined,
		});
		return compatibleSkus.length > 0;
	};

	const prefetchColorImage = (colorId: string) => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: colorId,
			materialSlug: currentMaterial ?? undefined,
			size: currentSize ?? undefined,
		});
		const sku = compatibleSkus[0];
		const primaryImage = sku?.images[0];
		if (primaryImage?.url) {
			const link = document.createElement("link");
			link.rel = "prefetch";
			link.as = "image";
			link.href = primaryImage.url;
			if (!document.querySelector(`link[href="${primaryImage.url}"]`)) {
				document.head.appendChild(link);
			}
		}
	};

	const updateColor = (colorId: string | null) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticColor(colorId);
			const params = new URLSearchParams(searchParams.toString());
			if (colorId) {
				params.set("color", colorId);
			} else {
				params.delete("color");
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: colors,
		getOptionId: (color) => color.slug ?? color.id,
		isOptionDisabled: (color) => !isColorAvailable(color.slug ?? color.id),
		onSelect: (color) => updateColor(color.slug ?? color.id),
	});

	if (colors.length === 0) {
		return (
			<div role="status" className="sr-only">
				Aucune couleur disponible
			</div>
		);
	}

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			className="group/color space-y-3"
			aria-label="Sélection de couleur"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{showMaterialLabel ? "Couleur / Matériau" : "Couleur"}
					{optimisticColor && (
						<span className="text-muted-foreground ml-1 font-normal">
							: {colors.find((c) => (c.slug ?? c.id) === optimisticColor)?.name}
						</span>
					)}
				</legend>
				{optimisticColor && (
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground text-xs/5 tracking-normal antialiased group-has-[[data-pending]]/color:opacity-70"
						onClick={() => updateColor(null)}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div ref={containerRef} className="flex flex-wrap gap-3">
				{colors.map((color, index) => {
					const colorIdentifier = color.slug ?? color.id;
					const isSelected = colorIdentifier === optimisticColor;
					const isAvailable = isColorAvailable(colorIdentifier);

					return (
						<button
							key={color.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={colorIdentifier}
							onClick={() => updateColor(colorIdentifier)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							onPointerEnter={() =>
								isAvailable && !isSelected && prefetchColorImage(colorIdentifier)
							}
							disabled={!isAvailable}
							className={cn(
								"group relative flex min-h-13 items-center gap-2.5 rounded-xl border-2 p-3.5 transition-all sm:min-h-11 sm:rounded-lg sm:p-3",
								"hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50",
							)}
						>
							{color.hex && (
								<div
									className="border-background h-8 w-8 shrink-0 rounded-full border-2 shadow-sm sm:h-7 sm:w-7"
									style={{ backgroundColor: color.hex }}
								/>
							)}
							<div className="text-left">
								<span className="text-sm/6 font-medium tracking-normal antialiased">
									{color.name}
								</span>
								{!isAvailable && (
									<p className="text-muted-foreground text-xs/5 tracking-normal antialiased">
										Indisponible
									</p>
								)}
							</div>
							{isSelected && (
								<m.div
									initial={shouldReduceMotion ? {} : { scale: 0 }}
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
