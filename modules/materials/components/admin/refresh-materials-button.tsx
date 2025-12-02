"use client";

import { Button } from "@/shared/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRefreshMaterials } from "@/modules/materials/hooks/use-refresh-materials";

export function RefreshMaterialsButton() {
	const { refresh, isPending } = useRefreshMaterials();

	return (
		<div className="hidden md:block">
			<Button
				variant="outline"
				size="icon"
				onClick={refresh}
				disabled={isPending}
				title="Rafraîchir les matériaux"
			>
				<RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
			</Button>
		</div>
	);
}
