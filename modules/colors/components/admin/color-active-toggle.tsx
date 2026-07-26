"use client";

import { TaxonomyActiveToggle } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useToggleColorStatus } from "@/modules/colors/hooks/use-toggle-color-status";

interface ColorActiveToggleProps {
	colorId: string;
	isActive: boolean;
}

export function ColorActiveToggle({ colorId, isActive }: ColorActiveToggleProps) {
	const { toggleStatus, isPending } = useToggleColorStatus();

	return (
		<TaxonomyActiveToggle
			id={colorId}
			isActive={isActive}
			toggleStatus={toggleStatus}
			isPending={isPending}
		/>
	);
}
