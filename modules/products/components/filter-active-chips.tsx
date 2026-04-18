"use client";

import { Badge } from "@/shared/components/ui/badge";
import ScrollFade from "@/shared/components/scroll-fade";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { X } from "lucide-react";
import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { ProductTypeOption } from "./filter-section-types";

// ============================================================================
// TYPES
// ============================================================================

export type FilterChipDescriptor =
	| { kind: "type"; slug: string }
	| { kind: "color"; slug: string }
	| { kind: "material"; slug: string }
	| { kind: "price" }
	| { kind: "rating" }
	| { kind: "inStock" }
	| { kind: "onSale" };

interface FilterActiveChipsProps {
	formData: FilterFormData;
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes: ProductTypeOption[];
	defaultPriceRange: [number, number];
	onRemove: (chip: FilterChipDescriptor) => void;
}

interface Chip {
	key: string;
	label: string;
	descriptor: FilterChipDescriptor;
	/** Optional swatch rendered before the label (color chip). */
	swatch?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Chips horizontales listant les filtres actifs avec X pour suppression
 * rapide. Pattern Shopify Dawn / Airbnb — permet de défaire un filtre
 * sans ouvrir sa section dans l'accordion.
 */
export function FilterActiveChips({
	formData,
	colors,
	materials,
	productTypes,
	defaultPriceRange,
	onRemove,
}: FilterActiveChipsProps) {
	const haptic = useHaptic();

	const chips: Chip[] = [];

	for (const slug of formData.productTypes) {
		const type = productTypes.find((t) => t.slug === slug);
		chips.push({
			key: `type-${slug}`,
			label: type?.label ?? slug,
			descriptor: { kind: "type", slug },
		});
	}

	for (const slug of formData.colors) {
		const color = colors.find((c) => c.slug === slug);
		chips.push({
			key: `color-${slug}`,
			label: color?.name ?? slug,
			descriptor: { kind: "color", slug },
			swatch: color?.hex,
		});
	}

	for (const slug of formData.materials) {
		const material = materials.find((m) => m.slug === slug);
		chips.push({
			key: `material-${slug}`,
			label: material?.name ?? slug,
			descriptor: { kind: "material", slug },
		});
	}

	const hasCustomPrice =
		formData.priceRange[0] !== defaultPriceRange[0] ||
		formData.priceRange[1] !== defaultPriceRange[1];
	if (hasCustomPrice) {
		chips.push({
			key: "price",
			label: `${formData.priceRange[0]}€ — ${formData.priceRange[1]}€`,
			descriptor: { kind: "price" },
		});
	}

	if (formData.ratingMin !== null) {
		chips.push({
			key: "rating",
			label: `${formData.ratingMin}+ ★`,
			descriptor: { kind: "rating" },
		});
	}

	if (formData.inStockOnly) {
		chips.push({
			key: "inStock",
			label: "En stock",
			descriptor: { kind: "inStock" },
		});
	}

	if (formData.onSale) {
		chips.push({
			key: "onSale",
			label: "En promotion",
			descriptor: { kind: "onSale" },
		});
	}

	if (chips.length === 0) return null;

	return (
		<section
			aria-label={`Filtres actifs : ${chips.length}`}
			className="border-border/50 bg-background/85 sticky top-0 z-10 -mx-6 -mt-4 mb-4 border-b px-6 pt-4 pb-3 backdrop-blur-md"
		>
			<ScrollFade axis="horizontal" hideScrollbar>
				<ul className="flex flex-nowrap items-center gap-2 py-1">
					{chips.map((chip) => (
						<li key={chip.key} className="shrink-0">
							<button
								type="button"
								onClick={() => {
									haptic("light");
									onRemove(chip.descriptor);
								}}
								className="focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
								aria-label={`Supprimer le filtre ${chip.label}`}
							>
								<Badge
									variant="secondary"
									className="hover:bg-destructive/10 hover:text-destructive gap-1.5 px-3 py-1 text-xs font-medium transition-colors"
								>
									{chip.swatch && (
										<span
											aria-hidden="true"
											className="border-border/50 inline-block size-3 shrink-0 rounded-full border"
											style={{ backgroundColor: chip.swatch }}
										/>
									)}
									<span>{chip.label}</span>
									<X className="size-3 shrink-0" aria-hidden="true" />
								</Badge>
							</button>
						</li>
					))}
				</ul>
			</ScrollFade>
		</section>
	);
}
