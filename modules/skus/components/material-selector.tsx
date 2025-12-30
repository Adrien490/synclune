"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { Material } from "@/modules/skus/types/sku-selector.types";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { motion, useReducedMotion } from "motion/react";

interface MaterialSelectorProps {
	materials: Material[];
	product: GetProductReturn;
	defaultSku?: ProductSku;
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
 * - Navigation clavier (fleches)
 */
export function MaterialSelector({
	materials,
	product,
	defaultSku,
}: MaterialSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	// Lire l'état depuis l'URL (source de vérité), fallback sur defaultSku
	const currentMaterial = searchParams.get("material") ?? defaultSku?.material?.name ?? null;
	const currentColor = searchParams.get("color");
	const currentSize = searchParams.get("size");

	// Etat optimiste pour une selection instantanee
	const [optimisticMaterial, setOptimisticMaterial] = useOptimistic(currentMaterial);

	// Calculer la disponibilité d'un matériau
	const isMaterialAvailable = (materialSlug: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: currentColor || undefined,
			materialSlug: materialSlug,
			size: currentSize || undefined,
		});
		return compatibleSkus.length > 0;
	};

	// Mettre à jour le matériau dans l'URL (optimiste)
	const updateMaterial = (materialSlug: string | null) => {
		startTransition(() => {
			setOptimisticMaterial(materialSlug);
			const params = new URLSearchParams(searchParams.toString());
			if (materialSlug) {
				params.set("material", materialSlug);
			} else {
				params.delete("material");
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	// Navigation clavier pour le radio group
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: materials,
		getOptionId: (material) => material.name,
		isOptionDisabled: (material) => !isMaterialAvailable(material.name),
		onSelect: (material) => updateMaterial(material.name),
	});

	// Ne pas afficher si un seul matériau ou aucun
	if (materials.length <= 1) return null;

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			className="group/material space-y-3"
			role="radiogroup"
			aria-label="Sélection de matériau"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					Matériau
				</legend>
				{optimisticMaterial && (
					<Button
						variant="ghost"
						size="sm"
						className="text-xs/5 tracking-normal antialiased text-muted-foreground group-has-[[data-pending]]/material:opacity-70"
						onClick={() => updateMaterial(null)}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div ref={containerRef} className="grid grid-cols-2 gap-2">
				{materials.map((material, index) => {
					// Comparaison insensible à la casse pour éviter les problèmes de matching
					const isSelected =
						material.name.toLowerCase() === optimisticMaterial?.toLowerCase();
					const isAvailable = isMaterialAvailable(material.name);

					return (
						<button
							key={material.name}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={material.name}
							onClick={() => updateMaterial(material.name)}
							onKeyDown={(e) => handleKeyDown(e, index)}
							disabled={!isAvailable}
							className={cn(
								"flex items-center justify-between p-3 rounded-lg border text-left transition-all",
								"hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
								!isAvailable && "opacity-70 saturate-50"
							)}
						>
							<span className="text-sm/6 tracking-normal antialiased font-medium">
								{material.name}
							</span>
							{isSelected && (
								<motion.div
									initial={shouldReduceMotion ? {} : { scale: 0 }}
									animate={{ scale: 1 }}
									transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 15 }}
								>
									<Check className="w-4 h-4 text-primary" aria-hidden="true" />
								</motion.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
