"use client";

import { Badge } from "@/shared/components/ui/badge";
import ScrollFade from "@/shared/components/scroll-fade";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { formatDateShort } from "@/shared/utils/dates";
import { X } from "lucide-react";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { AdminFilterFormData } from "./products-filter-sheet.types";
import { STATUS_OPTIONS } from "./products-filter-sheet.types";

// ============================================================================
// TYPES
// ============================================================================

export type AdminFilterChipDescriptor =
	| { kind: "status"; value: string }
	| { kind: "type"; slug: string }
	| { kind: "color"; slug: string }
	| { kind: "material"; slug: string }
	| { kind: "collection"; id: string }
	| { kind: "price" }
	| { kind: "stockStatus" }
	| { kind: "onSale" }
	| { kind: "createdAfter" }
	| { kind: "createdBefore" }
	| { kind: "updatedAfter" }
	| { kind: "updatedBefore" };

interface AdminFilterActiveChipsProps {
	formData: AdminFilterFormData;
	productTypes: Array<{ id: string; label: string; slug: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	defaultPriceRange: [number, number];
	onRemove: (chip: AdminFilterChipDescriptor) => void;
}

interface Chip {
	key: string;
	label: string;
	descriptor: AdminFilterChipDescriptor;
	swatch?: string;
}

const STOCK_STATUS_LABELS: Record<string, string> = {
	in_stock: "En stock",
	out_of_stock: "Rupture de stock",
};

function safeFormatDate(value: string): string {
	if (!value) return value;
	try {
		return formatDateShort(value);
	} catch {
		return value;
	}
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Chips horizontales listant les filtres admin actifs avec X pour suppression
 * rapide. Pattern parallèle au shop FilterActiveChips, adapté aux descripteurs
 * admin (statut, collections, dates).
 */
export function AdminFilterActiveChips({
	formData,
	productTypes,
	collections,
	colors,
	materials,
	defaultPriceRange,
	onRemove,
}: AdminFilterActiveChipsProps) {
	const haptic = useHaptic();

	const chips: Chip[] = [];

	for (const value of formData.statuses) {
		const opt = STATUS_OPTIONS.find((s) => s.value === value);
		chips.push({
			key: `status-${value}`,
			label: opt?.label ?? value,
			descriptor: { kind: "status", value },
		});
	}

	for (const slug of formData.typeSlugs) {
		const type = productTypes.find((t) => t.slug === slug);
		chips.push({
			key: `type-${slug}`,
			label: type?.label ?? slug,
			descriptor: { kind: "type", slug },
		});
	}

	for (const id of formData.collectionIds) {
		const collection = collections.find((c) => c.id === id);
		chips.push({
			key: `collection-${id}`,
			label: collection?.name ?? id,
			descriptor: { kind: "collection", id },
		});
	}

	for (const slug of formData.colorSlugs) {
		const color = colors.find((c) => c.slug === slug);
		chips.push({
			key: `color-${slug}`,
			label: color?.name ?? slug,
			descriptor: { kind: "color", slug },
			swatch: color?.hex,
		});
	}

	for (const slug of formData.materialSlugs) {
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

	if (formData.stockStatus) {
		chips.push({
			key: "stockStatus",
			label: STOCK_STATUS_LABELS[formData.stockStatus] ?? formData.stockStatus,
			descriptor: { kind: "stockStatus" },
		});
	}

	if (formData.onSale) {
		chips.push({
			key: "onSale",
			label: "En promotion",
			descriptor: { kind: "onSale" },
		});
	}

	if (formData.createdAfter) {
		chips.push({
			key: "createdAfter",
			label: `Créé après le ${safeFormatDate(formData.createdAfter)}`,
			descriptor: { kind: "createdAfter" },
		});
	}
	if (formData.createdBefore) {
		chips.push({
			key: "createdBefore",
			label: `Créé avant le ${safeFormatDate(formData.createdBefore)}`,
			descriptor: { kind: "createdBefore" },
		});
	}
	if (formData.updatedAfter) {
		chips.push({
			key: "updatedAfter",
			label: `Modifié après le ${safeFormatDate(formData.updatedAfter)}`,
			descriptor: { kind: "updatedAfter" },
		});
	}
	if (formData.updatedBefore) {
		chips.push({
			key: "updatedBefore",
			label: `Modifié avant le ${safeFormatDate(formData.updatedBefore)}`,
			descriptor: { kind: "updatedBefore" },
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
