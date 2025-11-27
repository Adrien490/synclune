"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useExportSubscribers } from "@/modules/newsletter/hooks/admin/use-export-subscribers";

/**
 * Bouton d'export des abonnés newsletter avec menu déroulant
 *
 * Permet d'exporter :
 * - Tous les abonnés
 * - Seulement les actifs
 * - Seulement les inactifs
 *
 * Télécharge automatiquement le CSV au succès
 */
export function ExportSubscribersButton() {
	const { action, isPending, state, downloadCSV } = useExportSubscribers();

	// Télécharger automatiquement le CSV au succès
	useEffect(() => {
		if (
			state.status === ActionStatus.SUCCESS &&
			state.data &&
			typeof state.data === "object" &&
			"csv" in state.data &&
			"filename" in state.data
		) {
			const { csv, filename } = state.data as {
				csv: string;
				filename: string;
			};
			downloadCSV(csv, filename);
		}
	}, [state.status, state.data, downloadCSV]);

	const handleExport = (status: "all" | "active" | "inactive") => {
		const formData = new FormData();
		formData.append("status", status);
		formData.append("format", "csv");
		action(formData);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="w-full sm:w-auto"
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Export en cours...
						</>
					) : state.status === ActionStatus.SUCCESS ? (
						<>
							<CheckCircle2 className="w-4 h-4 mr-2 text-secondary-foreground" />
							Exporté
						</>
					) : (
						<>
							<Download className="w-4 h-4 mr-2" />
							Exporter CSV
						</>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Format d'export</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={() => handleExport("all")}
					disabled={isPending}
				>
					<Download className="w-4 h-4 mr-2" />
					Tous les abonnés
				</DropdownMenuItem>

				<DropdownMenuItem
					onClick={() => handleExport("active")}
					disabled={isPending}
				>
					<Download className="w-4 h-4 mr-2 text-secondary-foreground" />
					Seulement les actifs
				</DropdownMenuItem>

				<DropdownMenuItem
					onClick={() => handleExport("inactive")}
					disabled={isPending}
				>
					<Download className="w-4 h-4 mr-2 text-muted-foreground" />
					Seulement les inactifs
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
