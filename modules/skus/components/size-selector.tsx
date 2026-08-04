"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductSku } from "@/modules/products/types/product-services.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
import type { Size } from "@/modules/skus/types/sku-selector.types";
import dynamic from "next/dynamic";

// Lazy loading - dialog charge uniquement a l'ouverture
const SizeGuideDialog = dynamic(() =>
	import("./size-guide-dialog").then((mod) => mod.SizeGuideDialog),
);
import { useRadioGroupKeyboard } from "@/shared/hooks/use-radio-group-keyboard";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { m, useReducedMotion } from "motion/react";

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
function SizeSelectorInner({
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
	const shouldReduceMotion = useReducedMotion();

	// Lire l'état depuis l'URL (source de vérité), fallback sur defaultSku
	const rawSize = searchParams.get("size") ?? defaultSku?.size ?? null;
	// Garde-fou URL stale : un ?size=<value> retiré du catalogue (bookmark, partage)
	// ne doit pas laisser l'UI en état "aucune option" alors que la query string dit l'inverse.
	const currentSize = rawSize && sizes.some((s) => s.size === rawSize) ? rawSize : null;
	const currentColor = searchParams.get("color");
	const currentMaterial = searchParams.get("material");

	// Etat optimiste pour une selection instantanee
	const [optimisticSize, setOptimisticSize] = useOptimistic(currentSize);

	// Calculer la disponibilité d'une taille
	const isSizeAvailable = (size: string): boolean => {
		const compatibleSkus = filterCompatibleSkus(product, {
			colorSlug: currentColor ?? undefined,
			materialSlug: currentMaterial ?? undefined,
			size: size,
		});
		return compatibleSkus.length > 0;
	};

	// Mettre à jour la taille dans l'URL (optimiste)
	const updateSize = (size: string | null) => {
		triggerHaptic("selection");
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
	// Pas de gate `isOptionDisabled` ici : on laisse le focus traverser les
	// options indisponibles pour qu'elles soient annoncées par les lecteurs
	// d'écran (cf. WCAG 1.3.1). La mutation reste bloquée par le guard
	// `isSizeAvailable` ci-dessous + le no-op `onClick` côté bouton.
	const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
		options: sizes,
		getOptionId: (sizeOption) => sizeOption.size,
		onSelect: (sizeOption) => {
			if (isSizeAvailable(sizeOption.size)) updateSize(sizeOption.size);
		},
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
			aria-busy={isPending || undefined}
			className="space-y-3"
			aria-label="Sélection de taille"
		>
			<div className="flex items-center justify-between">
				<legend className="text-sm/6 font-semibold tracking-tight antialiased">
					{getSizeLabel()}
				</legend>
				<div className="flex items-center gap-2">
					<SizeGuideDialog productTypeSlug={productTypeSlug} />
					{optimisticSize ? (
						<Button
							variant="ghost"
							size="sm"
							aria-busy={isPending || undefined}
							className="text-muted-foreground text-xs/5 tracking-normal antialiased aria-busy:opacity-70"
							onClick={() => updateSize(null)}
							type="button"
						>
							Réinitialiser
						</Button>
					) : null}
				</div>
			</div>
			<div
				ref={containerRef}
				className="xs:grid-cols-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-2"
			>
				{sizes.map((sizeOption, index) => {
					const isSelected = sizeOption.size === optimisticSize;
					const isAvailable = isSizeAvailable(sizeOption.size);

					return (
						<button
							key={sizeOption.size}
							type="button"
							role="radio"
							aria-checked={isSelected}
							aria-disabled={!isAvailable}
							aria-label={`Taille ${sizeOption.size}${!isAvailable ? " (indisponible)" : ""}`}
							data-option-id={sizeOption.size}
							onClick={() => {
								if (!isAvailable) return;
								updateSize(sizeOption.size);
							}}
							onKeyDown={(e) => handleKeyDown(e, index)}
							className={cn(
								"relative flex min-h-13 items-center justify-center rounded-xl border-2 p-3 text-center transition-all sm:min-h-11 sm:rounded-lg sm:p-2.5",
								"hover:shadow-sm active:scale-[0.98]",
								"aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:saturate-50",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
							)}
						>
							<span className="text-sm/6 font-medium tracking-normal antialiased">
								{sizeOption.size}
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
									className="absolute top-1.5 right-1.5"
								>
									<CheckIcon className="text-primary h-3.5 w-3.5" aria-hidden="true" />
								</m.div>
							)}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}

export function SizeSelector(props: ComponentProps<typeof SizeSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<SizeSelectorInner {...props} />
		</Suspense>
	);
}
