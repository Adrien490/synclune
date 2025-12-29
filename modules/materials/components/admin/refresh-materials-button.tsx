"use client";

import { RefreshButton } from "@/shared/components/refresh-button";
import { useRefreshMaterials } from "@/modules/materials/hooks/use-refresh-materials";

export function RefreshMaterialsButton() {
	const { refresh, isPending } = useRefreshMaterials();

	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label="Rafraîchir les matériaux"
		/>
	);
}
