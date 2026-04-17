"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SectionHeader } from "./filter-section-header";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductTypeOption {
	slug: string;
	label: string;
	_count?: { products: number };
}

interface TypeFilterSectionProps {
	productTypes: ProductTypeOption[];
	selectedValues: string[];
	onToggle: (slug: string, checked: boolean) => void;
	onReset: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TypeFilterSection({
	productTypes,
	selectedValues,
	onToggle,
	onReset,
}: TypeFilterSectionProps) {
	const haptic = useHaptic();
	if (productTypes.length === 0) return null;

	return (
		<AccordionItem value="types">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader label="Types de bijoux" count={selectedValues.length} onReset={onReset} />
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-1">
					{productTypes.map((type) => {
						const isSelected = selectedValues.includes(type.slug);
						return (
							<CheckboxFilterItem
								key={type.slug}
								id={`type-${type.slug}`}
								checked={isSelected}
								onCheckedChange={(checked) => {
									haptic("selection");
									onToggle(type.slug, checked === true);
								}}
								count={type._count?.products}
							>
								{type.label}
							</CheckboxFilterItem>
						);
					})}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
