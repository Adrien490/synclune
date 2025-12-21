"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { Size } from "@/modules/skus/types/sku-selector.types";
import { SizeGuideDialog } from "./size-guide-dialog";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";

interface SizeSelectorProps {
	sizes: Size[];
	product: GetProductReturn;
	productTypeSlug?: string | null;
	shouldShow: boolean;
	defaultSku?: ProductSku;
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
 * - Navigation clavier (fleches)
 */
export function SizeSelector({
	sizes,
	product,
	productTypeSlug,
	shouldShow,
	defaultSku,
}: SizeSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Lire l'état depuis l'URL (source de vérité), fallback sur defaultSku
	const currentSize = searchParams.get("size") ?? defaultSku?.size ?? null;
	const currentColor = searchParams.get("color");
	const currentMaterial = searchParams.get("material");

	// Etat optimiste pour une selection instantanee
	const [optimisticSize, setOptimisticSize] = useOptimistic(currentSize);

	// Calculer la disponibilité d'une taille
	const isSizeAvailable = (size: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: currentColor || undefined,
			materialSlug: currentMaterial || undefined,
			size: size,
		});
		return compatibleSkus.length > 0;
	};

	// Mettre à jour la taille dans l'URL (optimiste)
	const updateSize = (size: string | null) => {
		startTransition(() => {
			setOptimisticSize(size);
			const params = new URLSearchParams(searchParams.toString());
			if (size) {
				params.set("size", size);
			} else {
				params.delete("size");
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	// Navigation clavier pour le radio group
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: sizes,
		getOptionId: (sizeOption) => sizeOption.size,
		isOptionDisabled: (sizeOption) => !isSizeAvailable(sizeOption.size),
		onSelect: (sizeOption) => updateSize(sizeOption.size),
	});

	if (!shouldShow || sizes.length === 0) return null;

	// Label adapté au type de produit (comparaison insensible à la casse)
	const getSizeLabel = () => {
		const slug = productTypeSlug?.toLowerCase();
		if (slug === "rings" || slug === "ring") return "Taille (Diametre)";
		if (slug === "bracelets" || slug === "bracelet") return "Taille (Tour de poignet)";
		return "Taille";
	};

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			className="group/size space-y-3"
			role="radiogroup"
			aria-label="Sélection de taille"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{getSizeLabel()}
				</legend>
				<div className="flex items-center gap-2">
					<SizeGuideDialog productTypeSlug={productTypeSlug} />
					{optimisticSize && (
						<Button
							variant="ghost"
							size="sm"
							className="text-xs/5 tracking-normal antialiased text-muted-foreground group-has-[[data-pending]]/size:opacity-70"
							onClick={() => updateSize(null)}
							type="button"
						>
							Réinitialiser
						</Button>
					)}
				</div>
			</div>
			<div ref={containerRef} className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-2">
				{sizes.map((sizeOption, index) => {
					const isSelected = sizeOption.size === optimisticSize;
					const isAvailable = isSizeAvailable(sizeOption.size);

					return (
						<button
							key={sizeOption.size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`Taille ${sizeOption.size}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={sizeOption.size}
							onClick={() => updateSize(sizeOption.size)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							disabled={!isAvailable}
							className={cn(
								"p-3 sm:p-2.5 min-h-[52px] sm:min-h-[44px] flex items-center justify-center text-center rounded-xl sm:rounded-lg border-2 transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50"
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
