"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { RefreshTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useRefreshMaterials } from "@/modules/materials/hooks/use-refresh-materials";

interface RefreshMaterialsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshMaterialsButton({ className, variant }: RefreshMaterialsButtonProps) {
	const { refresh, isPending } = useRefreshMaterials();

	return (
		<RefreshTaxonomyButton
			config={TAXONOMY_CONFIG.material}
			refresh={refresh}
			isPending={isPending}
			className={className}
			variant={variant}
		/>
	);
}
