"use client";

import { TaxonomyActiveToggle } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";

interface MaterialActiveToggleProps {
	materialId: string;
	isActive: boolean;
}

export function MaterialActiveToggle({ materialId, isActive }: MaterialActiveToggleProps) {
	const { toggleStatus, isPending } = useToggleMaterialStatus();

	return (
		<TaxonomyActiveToggle
			id={materialId}
			isActive={isActive}
			toggleStatus={toggleStatus}
			isPending={isPending}
		/>
	);
}
