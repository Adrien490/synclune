"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { SectionHeader } from "./filter-section-header";

// ============================================================================
// TYPES
// ============================================================================

interface AvailabilityFilterSectionProps {
	inStockOnly: boolean;
	onSale: boolean;
	onInStockChange: (checked: boolean) => void;
	onSaleChange: (checked: boolean) => void;
	onReset: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AvailabilityFilterSection({
	inStockOnly,
	onSale,
	onInStockChange,
	onSaleChange,
	onReset,
}: AvailabilityFilterSectionProps) {
	return (
		<AccordionItem value="availability" className="border-b-0">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader
					label="Disponibilité"
					count={(inStockOnly ? 1 : 0) + (onSale ? 1 : 0)}
					onReset={onReset}
				/>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-1">
					<CheckboxFilterItem
						id="filter-in-stock"
						checked={inStockOnly}
						onCheckedChange={(checked) => {
							onInStockChange(checked === true);
						}}
					>
						En stock uniquement
					</CheckboxFilterItem>
					<CheckboxFilterItem
						id="filter-on-sale"
						checked={onSale}
						onCheckedChange={(checked) => {
							onSaleChange(checked === true);
						}}
					>
						En promotion
					</CheckboxFilterItem>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
