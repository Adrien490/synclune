"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleVariants } from "@/modules/variants/services/variant-filter.service";
import { buildSwatchStyle } from "@/modules/colors/utils/swatch-style";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import type { ProductVariantInfo } from "@/shared/types/product-variant.types";
import { slugify } from "@/shared/utils/generate-slug";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

type AvailableColor = ProductVariantInfo["availableColors"][number];

interface ColorSelectorProps {
	/**
	 * Couleurs disponibles extraites du produit (une pastille = une couleur ;
	 * schéma lean, une variante porte UNE couleur). Pilote l'URL via
	 * `?color=<slug>` où le slug est le NOM de couleur slugifié.
	 */
	colors: AvailableColor[];
	product: GetProductReturn;
	showMaterialLabel?: boolean;
	defaultVariant?: ProductVariant;
}

/**
 * Sélecteur de couleur — schéma lean : une pastille par couleur.
 *
 * - Pilote l'URL via `?color=<slug>` (slug = nom slugifié, Color n'a plus de
 *   colonne slug).
 * - Normalise un `?color=` stale (couleur retirée du catalogue) vers la
 *   couleur par défaut pour éviter un état "rien de sélectionné" silencieux.
 * - Clavier (Arrow/Home/End) : le focus traverse les options indisponibles
 *   (aria-disabled) pour permettre l'annonce SR, mais l'action est bloquée.
 */
function ColorSelectorInner({
	colors,
	product,
	showMaterialLabel = false,
	defaultVariant,
}: ColorSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const legendId = useId();

	const defaultColorSlug = defaultVariant?.color
		? slugify(defaultVariant.color.name)
		: defaultVariant?.material
			? slugify(defaultVariant.material.name)
			: null;

	const rawColor = searchParams.get("color") ?? defaultColorSlug;
	// Garde-fou URL stale : un ?color=<slug> retiré du catalogue (bookmark
	// vieillot, partage social, produit édité) ne doit pas laisser l'UI en état
	// "aucune option" alors que la query string dit l'inverse → fallback default.
	const currentColor =
		rawColor && colors.some((c) => c.slug === rawColor) ? rawColor : defaultColorSlug;
	const currentMaterial = searchParams.get("material");
	const currentSize = searchParams.get("size");

	const [optimisticColor, setOptimisticColor] = useOptimistic(currentColor);

	const isColorAvailable = (colorSlug: string): boolean => {
		const compatibleVariants = filterCompatibleVariants(product, {
			colorSlug,
			materialSlug: currentMaterial ?? undefined,
			size: currentSize ?? undefined,
		});
		return compatibleVariants.length > 0;
	};

	const updateColor = (colorSlug: string | null) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticColor(colorSlug);
			const params = new URLSearchParams(searchParams.toString());
			if (colorSlug) {
				params.set("color", colorSlug);
			} else {
				params.delete("color");
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	const { containerRef, handleKeyDown, getTabIndex } = useRadioGroupKeyboard({
		options: colors,
		getOptionId: (color) => color.slug ?? color.id,
		// Pas de gate `isOptionDisabled` ici : on laisse le focus traverser les
		// options indisponibles pour qu'elles soient annoncées par les lecteurs
		// d'écran (cf. WCAG 1.3.1). La mutation d'URL reste bloquée par le guard
		// `isColorAvailable` ci-dessous + le no-op `onClick` côté bouton.
		onSelect: (color) => {
			const slug = color.slug ?? color.id;
			if (isColorAvailable(slug)) updateColor(slug);
		},
		// Le groupe est UN seul arrêt de tabulation (ARIA APG) : les plaquettes
		// épuisées se rejoignent aux flèches, pas au TAB.
		activeOptionId: optimisticColor,
	});

	if (colors.length === 0) {
		return (
			<div role="status" className="sr-only">
				Aucune couleur disponible
			</div>
		);
	}

	const currentLabel = colors.find((c) => (c.slug ?? c.id) === optimisticColor)?.name ?? null;

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending || undefined}
			className="space-y-3"
		>
			{/* Pas d'`aria-label` sur le `fieldset` : il ÉCRASAIT la `<legend>`, seule
			    porteuse de l'information utile (« Couleur / Matériau : Perle »). Le nom
			    du groupe de radios est repris de cette légende via `aria-labelledby`. */}
			<div className="flex items-center justify-between">
				<legend id={legendId} className="text-sm/6 font-semibold tracking-tight antialiased">
					{showMaterialLabel ? "Couleur / Matériau" : "Couleur"}
					{currentLabel && (
						<span className="text-muted-foreground ml-1 font-normal">: {currentLabel}</span>
					)}
				</legend>
				{optimisticColor && (
					<Button
						variant="ghost"
						size="sm"
						aria-busy={isPending || undefined}
						className="text-muted-foreground text-xs/5 tracking-normal antialiased aria-busy:opacity-70"
						onClick={() => updateColor(null)}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			{/* Le nuancier : on voit la couleur AVANT de lire son nom.
			    La plaquette de 88 × 56 donne un aplat franc, le nom dessous, et la
			    sélection est tenue par l'anneau d'encre.
			    La cible tactile fait ≈ 88 × 84, très au-dessus des 44 px requis. */}
			<div
				ref={containerRef}
				role="radiogroup"
				aria-labelledby={legendId}
				className="flex flex-wrap gap-2.5"
			>
				{colors.map((color, index) => {
					const slug = color.slug ?? color.id;
					const isSelected = slug === optimisticColor;
					const isAvailable = isColorAvailable(slug);
					const hexes = color.hex ? [color.hex] : [];
					const allLight = color.hex ? isLightColor(color.hex, 0.85) : false;

					return (
						<button
							key={slug}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-disabled={!isAvailable}
							aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={slug}
							tabIndex={getTabIndex(color, index)}
							onClick={() => {
								if (!isAvailable) return;
								updateColor(slug);
							}}
							onKeyDown={(e) => handleKeyDown(e, index)}
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
							{/* La sélection se lit par la FORME (anneau d'encre, épaisseur ET
							    teinte), jamais par la seule couleur — l'aplat, lui, appartient
							    au bijou. */}
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
										...buildSwatchStyle(hexes),
										// View Transition : morphing depuis la pastille de la ProductCard
										// (même slug) vers cette plaquette au moment du navigate.
										viewTransitionName: `variant-pill-${slug}`,
									}}
									aria-hidden="true"
								/>
								<span className="bg-card block grow px-2 py-1.5">
									<span className="block text-xs/4 font-medium tracking-normal antialiased">
										{color.name}
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
