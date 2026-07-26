"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { RefreshTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useRefreshProductTypes } from "@/modules/product-types/hooks/use-refresh-product-types";

interface RefreshProductTypesButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshProductTypesButton({ className, variant }: RefreshProductTypesButtonProps) {
	const { refresh, isPending } = useRefreshProductTypes();

	return (
		<RefreshTaxonomyButton
			config={TAXONOMY_CONFIG["product-type"]}
			refresh={refresh}
			isPending={isPending}
			className={className}
			variant={variant}
		/>
	);
}
