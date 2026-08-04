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
import { MaskingTape } from "@/shared/components/masking-tape";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import type { Color } from "@/modules/skus/types/sku-selector.types";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

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
			{/* Le nuancier : on voit la couleur AVANT de lire son nom.
			    Les pastilles de 28 px montraient une teinte trop petite pour être jugée
			    sur une boutique dont le positionnement EST la couleur — a fortiori pour
			    un dégradé bicolore. La plaquette de 88 × 56 donne un aplat franc, le nom
			    dessous, et la sélection est tenue par un bout de scotch (`MaskingTape`,
			    la primitive partagée avec les cartes et le carton de la galerie).
			    La cible tactile fait ≈ 88 × 84, très au-dessus des 44 px requis. */}
			<div ref={containerRef} className="flex flex-wrap gap-2.5">
				{combos.map((combo, index) => {
					const isSelected = combo.comboKey === optimisticCombo;
					const isAvailable = isComboAvailable(combo.comboKey);
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
								// `flex` : les plaquettes sont des items d'une rangée flex, donc
								// étirées à la hauteur de la plus haute (celle qui porte « épuisée »
								// sur deux lignes). Sans `flex` ici, le cadre interne gardait sa
								// hauteur naturelle et les anneaux d'encre ne s'alignaient plus.
								"group relative flex w-22 rounded-md text-left transition-transform",
								"active:scale-[0.98] motion-reduce:transition-none",
								"aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:saturate-50",
							)}
						>
							{/* La sélection se lit par la FORME (scotch + anneau d'encre), jamais
							    par la seule couleur — l'aplat, lui, appartient au bijou. */}
							{isSelected && (
								<MaskingTape className="bg-foreground/15 -top-1.5 left-1/2 z-10 h-3.5 w-11 -translate-x-1/2 -rotate-3" />
							)}
							<span
								className={cn(
									"flex w-full flex-col overflow-hidden rounded-md transition-shadow",
									isSelected
										? "ring-foreground ring-2"
										: "ring-foreground/15 can-hover:group-hover:ring-foreground/40 group-focus-visible:ring-foreground/40 ring-1",
								)}
							>
								<span
									className={cn("block h-14", allLight && "ring-border/40 ring-1 ring-inset")}
									style={{
										...buildSwatchStyle(combo.hexes),
										// View Transition : morphing depuis la pastille de la ProductCard
										// (même comboKey) vers cette plaquette au moment du navigate.
										viewTransitionName: `variant-pill-${combo.comboKey}`,
									}}
									aria-hidden="true"
								/>
								<span className="bg-card block grow px-2 py-1.5">
									<span className="block text-xs/4 font-medium tracking-normal antialiased">
										{combo.label}
									</span>
									{!isAvailable && (
										<span className="text-muted-foreground text-2xs/4 block tracking-normal antialiased">
											épuisée
										</span>
									)}
								</span>
							</span>
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
