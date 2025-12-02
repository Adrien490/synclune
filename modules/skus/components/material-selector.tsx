"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { AlertCircle, Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Material } from "@/modules/skus/types/sku-selector.types";

interface MaterialSelectorProps {
	materials: Material[];
	product: GetProductReturn;
}

/**
 * Composant autonome de sélection de matériau
 *
 * Responsabilités :
 * - Afficher les matériaux disponibles
 * - Gérer sa propre sélection via URL (useSearchParams)
 * - Calculer la disponibilité des options
 * - Afficher les options indisponibles
 * - Bouton de réinitialisation
 * - Affichage en grid 2 colonnes
 */
export function MaterialSelector({
	materials,
	product,
}: MaterialSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Lire l'état depuis l'URL (source de vérité)
	const selectedMaterial = searchParams.get("material");
	const currentColor = searchParams.get("color");
	const currentSize = searchParams.get("size");

	// Calculer la disponibilité d'un matériau
	const isMaterialAvailable = useCallback(
		(materialSlug: string): boolean => {
			const compatibleSkus = filterCompatibleSkus(product, {
				colorSlug: currentColor || undefined,
				materialSlug: materialSlug,
				size: currentSize || undefined,
			});
			return compatibleSkus.length > 0;
		},
		[product, currentColor, currentSize]
	);

	// Mettre à jour le matériau dans l'URL
	const updateMaterial = useCallback(
		(materialSlug: string | null) => {
			startTransition(() => {
				const params = new URLSearchParams(searchParams.toString());
				if (materialSlug) {
					params.set("material", materialSlug);
				} else {
					params.delete("material");
				}
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			});
		},
		[searchParams, pathname, router]
	);

	// Ne pas afficher si un seul matériau ou aucun
	if (materials.length <= 1) return null;

	return (
		<fieldset
			className="space-y-3"
			role="radiogroup"
			aria-label="Sélection de matériau"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					Matériau
				</legend>
				{selectedMaterial && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs/5 tracking-normal antialiased text-muted-foreground"
						onClick={() => updateMaterial(null)}
						disabled={isPending}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div className="grid grid-cols-2 gap-2">
				{materials.map((material) => {
					// Comparaison insensible à la casse pour éviter les problèmes de matching
					const isSelected =
						material.name.toLowerCase() === selectedMaterial?.toLowerCase();
					const isAvailable = isMaterialAvailable(material.name);

					return (
						<button
							key={material.name}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
							onClick={() => updateMaterial(material.name)}
							disabled={!isAvailable || isPending}
							className={cn(
								"flex items-center justify-between p-3 rounded-lg border text-left transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50",
								isPending && "opacity-60"
							)}
						>
							<span className="text-sm/6 tracking-normal antialiased font-medium">
								{material.name}
							</span>
							{isSelected && <Check className="w-4 h-4 text-primary" />}
							{!isAvailable && (
								<AlertCircle className="w-4 h-4 text-muted-foreground" />
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
