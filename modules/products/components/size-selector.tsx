"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/products/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Size } from "./variant-selector/types";

interface SizeSelectorProps {
	sizes: Size[];
	product: GetProductReturn;
	productTypeSlug?: string | null;
	shouldShow: boolean;
}

/**
 * Composant autonome de sélection de taille
 *
 * Responsabilités :
 * - Afficher les tailles disponibles
 * - Gérer sa propre sélection via URL (useSearchParams)
 * - Calculer la disponibilité des options
 * - Afficher les options indisponibles
 * - Adapter le label selon le type de produit (bague, bracelet)
 * - Bouton de réinitialisation
 * - Affichage en grid adaptatif (3-4 colonnes)
 */
export function SizeSelector({
	sizes,
	product,
	productTypeSlug,
	shouldShow,
}: SizeSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Lire l'état depuis l'URL (source de vérité)
	const selectedSize = searchParams.get("size");
	const currentColor = searchParams.get("color");
	const currentMaterial = searchParams.get("material");

	// Calculer la disponibilité d'une taille
	const isSizeAvailable = useCallback(
		(size: string): boolean => {
			const compatibleSkus = filterCompatibleSkus(product, {
				colorSlug: currentColor || undefined,
				materialSlug: currentMaterial || undefined,
				size: size,
			});
			return compatibleSkus.length > 0;
		},
		[product, currentColor, currentMaterial]
	);

	// Mettre à jour la taille dans l'URL
	const updateSize = useCallback(
		(size: string | null) => {
			startTransition(() => {
				const params = new URLSearchParams(searchParams.toString());
				if (size) {
					params.set("size", size);
				} else {
					params.delete("size");
				}
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			});
		},
		[searchParams, pathname, router]
	);

	if (!shouldShow || sizes.length === 0) return null;

	// Label adapté au type de produit
	const getSizeLabel = () => {
		if (productTypeSlug === "RINGS") return "Taille (Diamètre)";
		if (productTypeSlug === "BRACELETS") return "Taille (Tour de poignet)";
		return "Taille";
	};

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de taille"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{getSizeLabel()}
				</legend>
				{selectedSize && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs/5 tracking-normal antialiased text-muted-foreground"
						onClick={() => updateSize(null)}
						disabled={isPending}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
				{sizes.map((sizeOption) => {
					const isSelected = sizeOption.size === selectedSize;
					const isAvailable = isSizeAvailable(sizeOption.size);

					return (
						<button
							key={sizeOption.size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`Taille ${sizeOption.size}${!isAvailable ? " (indisponible)" : ""}`}
							onClick={() => updateSize(sizeOption.size)}
							disabled={!isAvailable || isPending}
							className={cn(
								"p-2 text-center rounded-lg border transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50",
								isPending && "opacity-60"
							)}
						>
							<span className="text-sm/6 tracking-normal antialiased font-medium">
								{sizeOption.size}
							</span>
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
