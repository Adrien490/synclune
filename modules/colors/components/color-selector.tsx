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
import { motion, useReducedMotion } from "motion/react";

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
			role="radiogroup"
			aria-label="Sélection de couleur"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{showMaterialLabel ? "Couleur / Matériau" : "Couleur"}
					{optimisticColor && (
						<span className="font-normal text-muted-foreground ml-1">
							: {colors.find(c => (c.slug || c.id) === optimisticColor)?.name}
						</span>
					)}
				</legend>
				{optimisticColor && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs/5 tracking-normal antialiased text-muted-foreground group-has-[[data-pending]]/color:opacity-70"
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
							disabled={!isAvailable}
							className={cn(
								"group relative flex items-center gap-2.5 p-3.5 sm:p-3 rounded-xl sm:rounded-lg border-2 transition-all min-h-[52px] sm:min-h-[44px]",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50"
							)}
						>
							{color.hex && (
								<div
									className="w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 border-white shadow-sm shrink-0"
									style={{ backgroundColor: color.hex }}
								/>
							)}
							<div className="text-left">
								<span className="text-sm/6 tracking-normal antialiased font-medium">
									{color.name}
								</span>
								{!isAvailable && (
									<p className="text-xs/5 tracking-normal antialiased text-muted-foreground">
										Indisponible
									</p>
								)}
							</div>
							{isSelected && (
								<motion.div
									initial={shouldReduceMotion ? {} : { scale: 0 }}
									animate={{ scale: 1 }}
									transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 15 }}
								>
									<Check className="w-4 h-4 text-primary ml-auto" aria-hidden="true" />
								</motion.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
