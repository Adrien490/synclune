"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface Material {
	id: string;
	name: string;
}

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
 * - Afficher les options indisponibles (grayed out)
 * - Bouton de réinitialisation
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
		(materialId: string): boolean => {
			const compatibleSkus = filterCompatibleSkus(product, {
				colorSlug: currentColor || undefined,
				materialSlug: materialId,
				size: currentSize || undefined,
			});
			return compatibleSkus.length > 0;
		},
		[product, currentColor, currentSize]
	);

	// Mettre à jour le matériau dans l'URL
	const updateMaterial = useCallback(
		(materialId: string | null) => {
			startTransition(() => {
				const params = new URLSearchParams(searchParams.toString());
				if (materialId) {
					params.set("material", materialId);
				} else {
					params.delete("material");
				}
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			});
		},
		[searchParams, pathname, router]
	);

	if (materials.length === 0) return null;

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
			<div className="flex flex-wrap gap-3">
				{materials.map((material) => {
					const isSelected = material.id === selectedMaterial;
					const isAvailable = isMaterialAvailable(material.id);

					return (
						<button
							key={material.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
							onClick={() => updateMaterial(material.id)}
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
							<div className="text-left">
								<span className="text-sm/6 tracking-normal antialiased font-medium">
									{material.name}
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
