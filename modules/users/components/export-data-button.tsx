"use client";

import { Button } from "@/shared/components/ui/button";
import { useExportUserData } from "@/modules/users/hooks/use-export-user-data";

export function ExportDataButton() {
	const { exportData, isPending } = useExportUserData();

	return (
		<div className="space-y-2">
			<p className="text-sm text-muted-foreground">
				Téléchargez une copie de vos données personnelles au format JSON
				(profil, adresses, commandes, liste de souhaits).
			</p>
			<Button variant="outline" onClick={exportData} disabled={isPending}>
				{isPending ? "Export en cours..." : "Exporter mes données"}
			</Button>
		</div>
	);
}
