"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { Color } from "@/modules/skus/types/sku-selector.types";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { m, useReducedMotion } from "motion/react";

interface ColorSelectorProps {
	colors: Color[];
	product: GetProductReturn;
	showMaterialLabel?: boolean;
	defaultSku?: ProductSku;
}

/**
 * Composant autonome de sélection de couleur
 *
 * Responsabilités :
 * - Afficher les couleurs disponibles avec preview (hex)
 * - Gérer sa propre sélection via URL (useSearchParams)
 * - Calculer la disponibilité des options
 * - Afficher les options indisponibles (grayed out)
 * - Bouton de réinitialisation
 * - Navigation clavier (fleches)
 */
export function ColorSelector({
	colors,
	product,
	showMaterialLabel = false,
	defaultSku,
}: ColorSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	// Lire l'état depuis l'URL (source de vérité), fallback sur defaultSku
	const currentColor = searchParams.get("color") ?? defaultSku?.color?.slug ?? null;
	const currentMaterial = searchParams.get("material");
	const currentSize = searchParams.get("size");

	// Etat optimiste pour une selection instantanee
	const [optimisticColor, setOptimisticColor] = useOptimistic(currentColor);

	// Calculer la disponibilité d'une couleur
	const isColorAvailable = (colorId: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: colorId,
			materialSlug: currentMaterial || undefined,
			size: currentSize || undefined,
		});
		return compatibleSkus.length > 0;
	};

	// Prefetch primary image on hover to speed up gallery transition
	const prefetchColorImage = (colorId: string) => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: colorId,
			materialSlug: currentMaterial || undefined,
			size: currentSize || undefined,
		});
		const sku = compatibleSkus[0];
		const primaryImage = sku?.images?.[0];
		if (primaryImage?.url) {
			const link = document.createElement("link");
			link.rel = "prefetch";
			link.as = "image";
			link.href = primaryImage.url;
			// Avoid duplicate prefetch links
			if (!document.querySelector(`link[href="${primaryImage.url}"]`)) {
				document.head.appendChild(link);
			}
		}
	};

	// Mettre à jour la couleur dans l'URL (optimiste)
	const updateColor = (colorId: string | null) => {
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

	// Navigation clavier pour le radio group
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: colors,
		getOptionId: (color) => color.slug || color.id,
		isOptionDisabled: (color) => !isColorAvailable(color.slug || color.id),
		onSelect: (color) => updateColor(color.slug || color.id),
	});

	if (colors.length === 0) return null;

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
							: {colors.find((c) => (c.slug || c.id) === optimisticColor)?.name}
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
					// Utiliser le slug pour l'URL (cohérence avec material/size selectors)
					const colorIdentifier = color.slug || color.id;
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
									className="h-8 w-8 shrink-0 rounded-full border-2 border-white shadow-sm sm:h-7 sm:w-7"
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
