"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Color } from "@/modules/skus/types/sku-selector.types";

interface ColorSelectorProps {
	colors: Color[];
	product: GetProductReturn;
	showMaterialLabel?: boolean;
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
 */
export function ColorSelector({
	colors,
	product,
	showMaterialLabel = false,
}: ColorSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Lire l'état depuis l'URL (source de vérité)
	const selectedColor = searchParams.get("color");
	const currentMaterial = searchParams.get("material");
	const currentSize = searchParams.get("size");

	// Calculer la disponibilité d'une couleur
	const isColorAvailable = useCallback(
		(colorId: string): boolean => {
			const compatibleSkus = filterCompatibleSkus(product, {
				colorSlug: colorId,
				materialSlug: currentMaterial || undefined,
				size: currentSize || undefined,
			});
			return compatibleSkus.length > 0;
		},
		[product, currentMaterial, currentSize]
	);

	// Mettre à jour la couleur dans l'URL
	const updateColor = useCallback(
		(colorId: string | null) => {
			startTransition(() => {
				const params = new URLSearchParams(searchParams.toString());
				if (colorId) {
					params.set("color", colorId);
				} else {
					params.delete("color");
				}
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			});
		},
		[searchParams, pathname, router]
	);

	if (colors.length === 0) return null;

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de couleur"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{showMaterialLabel ? "Couleur / Matériau" : "Couleur"}
				</legend>
				{selectedColor && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs/5 tracking-normal antialiased text-muted-foreground"
						onClick={() => updateColor(null)}
						disabled={isPending}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div className="flex flex-wrap gap-3">
				{colors.map((color) => {
					// Utiliser le slug pour l'URL (cohérence avec material/size selectors)
					const colorIdentifier = color.slug || color.id;
					const isSelected = colorIdentifier === selectedColor;
					const isAvailable = isColorAvailable(colorIdentifier);

					return (
						<button
							key={color.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${color.name}${!isAvailable ? " (indisponible)" : ""}`}
							onClick={() => updateColor(colorIdentifier)}
							disabled={!isAvailable || isPending}
							className={cn(
								"group relative flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50",
								isPending && "opacity-60"
							)}
						>
							{color.hex && (
								<div
									className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
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
								<Check className="w-4 h-4 text-primary ml-auto" />
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
