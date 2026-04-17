"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { RatingStars } from "@/shared/components/rating-stars";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SectionHeader } from "./filter-section-header";

// ============================================================================
// TYPES
// ============================================================================

interface RatingFilterSectionProps {
	selectedValue: number | null;
	onChange: (value: number | null) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RatingFilterSection({ selectedValue, onChange }: RatingFilterSectionProps) {
	const haptic = useHaptic();
	return (
		<AccordionItem value="rating">
			<AccordionTrigger headingLevel={3} className="hover:no-underline">
				<SectionHeader
					label="Notes clients"
					count={selectedValue !== null ? 1 : 0}
					badgeContent={selectedValue !== null ? `${selectedValue}+ ★` : undefined}
					onReset={() => {
						haptic("light");
						onChange(null);
					}}
				/>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-1">
					{[5, 4, 3, 2, 1].map((stars) => {
						const isSelected = selectedValue === stars;
						return (
							<CheckboxFilterItem
								key={stars}
								id={`rating-${stars}`}
								checked={isSelected}
								onCheckedChange={(checked) => {
									haptic("selection");
									onChange(checked ? stars : null);
								}}
								indicator={<RatingStars rating={stars} size="sm" />}
							>
								{stars === 1 ? "1 étoile et plus" : `${stars} étoiles et plus`}
							</CheckboxFilterItem>
						);
					})}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
