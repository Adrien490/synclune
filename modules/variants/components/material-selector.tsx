"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleVariants } from "@/modules/variants/services/variant-filter.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductVariant } from "@/modules/products/types/product-services.types";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import type { Material } from "@/modules/variants/types/variant-selector.types";
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { m, useReducedMotion } from "motion/react";

interface MaterialSelectorProps {
	materials: Material[];
	product: GetProductReturn;
	defaultVariant?: ProductVariant;
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
function MaterialSelectorInner({ materials, product, defaultVariant }: MaterialSelectorProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();
	const legendId = useId();

	// Lire l'état depuis l'URL (source de vérité), fallback sur le matériau principal du defaultVariant
	const rawMaterial = searchParams.get("material") ?? defaultVariant?.material?.name ?? null;
	// Garde-fou URL stale : un ?material=<value> retiré du catalogue (bookmark, partage)
	// ne doit pas laisser l'UI en état "aucune option" alors que la query string dit l'inverse.
	const currentMaterial =
		rawMaterial && materials.some((m) => m.name.toLowerCase() === rawMaterial.toLowerCase())
			? rawMaterial
			: null;
	const currentColor = searchParams.get("color");
	const currentSize = searchParams.get("size");

	// Etat optimiste pour une selection instantanee
	const [optimisticMaterial, setOptimisticMaterial] = useOptimistic(currentMaterial);

	// Calculer la disponibilité d'un matériau
	const isMaterialAvailable = (materialName: string): boolean => {
		const compatibleVariants = filterCompatibleVariants(product, {
			colorSlug: currentColor ?? undefined,
			materialSlug: materialName,
			size: currentSize ?? undefined,
		});
		return compatibleVariants.length > 0;
	};

	// Mettre à jour le matériau dans l'URL (optimiste)
	const updateMaterial = (materialName: string | null) => {
		triggerHaptic("selection");
		startTransition(() => {
			setOptimisticMaterial(materialName);
			const params = new URLSearchParams(searchParams.toString());
			if (materialName) {
				params.set("material", materialName);
			} else {
				params.delete("material");
			}
			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		});
	};

	// Navigation clavier pour le radio group
	// Pas de gate `isOptionDisabled` ici : on laisse le focus traverser les
	// options indisponibles pour qu'elles soient annoncées par les lecteurs
	// d'écran (cf. WCAG 1.3.1). La mutation reste bloquée par le guard
	// `isMaterialAvailable` ci-dessous + le no-op `onClick` côté bouton.
	// ⚠️ Cette traversée n'a RIEN FAIT jusqu'au 2026-08-05 : `focusOption` excluait
	// `[aria-disabled="true"]` de sa requête, donc une flèche vers un matériau
	// indisponible ne déplaçait pas le focus (cul-de-sac muet).
	const { containerRef, handleKeyDown, getTabIndex } = useRadioGroupKeyboard({
		options: materials,
		getOptionId: (material) => material.name,
		onSelect: (material) => {
			if (isMaterialAvailable(material.name)) updateMaterial(material.name);
		},
		// Un seul arrêt de tabulation pour le groupe (ARIA APG) : les options
		// indisponibles se rejoignent aux flèches.
		activeOptionId: optimisticMaterial,
	});

	// Ne pas afficher si un seul matériau ou aucun
	if (materials.length <= 1) return null;

	return (
		<fieldset
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending || undefined}
			className="space-y-3"
		>
			{/* Pas d'`aria-label` sur le `fieldset` : il écrasait la `<legend>`. */}
			<div className="flex items-center justify-between">
				<legend id={legendId} className="text-sm/6 font-semibold tracking-tight antialiased">
					Matériau
				</legend>
				{optimisticMaterial && (
					<Button
						variant="ghost"
						size="sm"
						aria-busy={isPending || undefined}
						className="text-muted-foreground text-xs/5 tracking-normal antialiased aria-busy:opacity-70"
						onClick={() => updateMaterial(null)}
						type="button"
					>
						Réinitialiser
					</Button>
				)}
			</div>
			<div
				ref={containerRef}
				role="radiogroup"
				aria-labelledby={legendId}
				className="grid grid-cols-2 gap-2"
			>
				{materials.map((material, index) => {
					// Comparaison insensible à la casse pour éviter les problèmes de matching
					const isSelected = material.name.toLowerCase() === optimisticMaterial?.toLowerCase();
					const isAvailable = isMaterialAvailable(material.name);

					return (
						<button
							key={material.name}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-disabled={!isAvailable}
							aria-label={`${material.name}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={material.name}
							tabIndex={getTabIndex(material, index)}
							onClick={() => {
								if (!isAvailable) return;
								updateMaterial(material.name);
							}}
							onKeyDown={(e) => handleKeyDown(e, index)}
							className={cn(
								"flex min-h-13 items-center justify-between rounded-lg border p-3 text-left transition-all sm:min-h-11",
								"can-hover:hover:shadow-sm active:scale-95",
								"aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:saturate-50",
								// Rose PROFOND, pas `--primary` : la bordure et la coche sont les
								// porteuses de l'état « sélectionné », et le pastel ne mesure que
								// 1,6:1 sur la carte — WCAG 1.4.11 demande 3:1 pour un composant.
								// Même arbitrage que `shared/components/ui/radio-group.tsx`, qui
								// l'avait déjà tranché ; ce sélecteur maison était resté en arrière.
								isSelected
									? "border-brand-rose-strong bg-primary/5"
									: "border-border can-hover:hover:border-brand-rose-strong",
							)}
						>
							<span className="text-sm/6 font-medium tracking-normal antialiased">
								{material.name}
							</span>
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
									<CheckIcon className="text-brand-rose-strong h-4 w-4" aria-hidden="true" />
								</m.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

export function MaterialSelector(props: ComponentProps<typeof MaterialSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<MaterialSelectorInner {...props} />
		</Suspense>
	);
}
