"use client";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { RefreshTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { useRefreshColors } from "@/modules/colors/hooks/use-refresh-colors";

interface RefreshColorsButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshColorsButton({ className, variant }: RefreshColorsButtonProps) {
	const { refresh, isPending } = useRefreshColors();

	return (
		<RefreshTaxonomyButton
			config={TAXONOMY_CONFIG.color}
			refresh={refresh}
			isPending={isPending}
			className={className}
			variant={variant}
		/>
	);
}
