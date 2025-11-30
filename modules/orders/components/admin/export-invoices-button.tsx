"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { ActionStatus } from "@/shared/types/server-action";
import { CheckCircle2, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useExportInvoices } from "@/modules/orders/hooks/use-export-invoices";

/**
 * 📊 Bouton d'export du livre de recettes (factures)
 *
 * Permet d'exporter les factures selon différents critères :
 * - Année complète (ex: 2025)
 * - Mois spécifique (ex: Janvier 2025)
 * - Période personnalisée (date début → date fin)
 * - Toutes les factures
 *
 * Avec filtrage par statut (envoyées / archivées)
 *
 * Conformité légale française (Article 286 du CGI)
 */
export function ExportInvoicesButton() {
	const { action, isPending, state, downloadCSV } = useExportInvoices();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [periodType, setPeriodType] = useState<
		"all" | "year" | "month" | "custom"
	>("all");
	const [year, setYear] = useState(new Date().getFullYear().toString());
	const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [invoiceStatus, setInvoiceStatus] = useState<
		"all" | "sent" | "archived"
	>("all");

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
			// Fermer le dialog après succès
			setTimeout(() => {
				setDialogOpen(false);
			}, 1000);
		}
	}, [state.status, state.data, downloadCSV]);

	const handleQuickExport = (
		quickPeriodType: "all" | "year" | "month",
		quickYear?: number,
		quickMonth?: number
	) => {
		const formData = new FormData();
		formData.append("periodType", quickPeriodType);
		formData.append("format", "csv");
		formData.append("invoiceStatus", "all");

		if (quickYear) {
			formData.append("year", quickYear.toString());
		}
		if (quickMonth) {
			formData.append("month", quickMonth.toString());
		}

		action(formData);
	};

	const handleCustomExport = () => {
		const formData = new FormData();
		formData.append("periodType", periodType);
		formData.append("format", "csv");
		formData.append("invoiceStatus", invoiceStatus);

		if (periodType === "year") {
			formData.append("year", year);
		} else if (periodType === "month") {
			formData.append("year", year);
			formData.append("month", month);
		} else if (periodType === "custom") {
			formData.append("dateFrom", dateFrom);
			formData.append("dateTo", dateTo);
		}

		action(formData);
	};

	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	return (
		<>
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
								<FileSpreadsheet className="w-4 h-4 mr-2" />
								Livre de recettes
							</>
						)}
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuLabel>Export rapide (CSV)</DropdownMenuLabel>
					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => handleQuickExport("year", currentYear)}
						disabled={isPending}
					>
						<Download className="w-4 h-4 mr-2" />
						Année {currentYear}
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() =>
							handleQuickExport("month", currentYear, currentMonth)
						}
						disabled={isPending}
					>
						<Download className="w-4 h-4 mr-2" />
						{new Date(currentYear, currentMonth - 1).toLocaleDateString(
							"fr-FR",
							{
								month: "long",
								year: "numeric",
							}
						)}
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => handleQuickExport("year", currentYear - 1)}
						disabled={isPending}
					>
						<Download className="w-4 h-4 mr-2 text-muted-foreground" />
						Année {currentYear - 1}
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={() => setDialogOpen(true)}
						disabled={isPending}
					>
						<FileSpreadsheet className="w-4 h-4 mr-2" />
						Période personnalisée...
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => handleQuickExport("all")}
						disabled={isPending}
					>
						<Download className="w-4 h-4 mr-2 text-muted-foreground" />
						Toutes les factures
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Dialog pour export personnalisé */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Export personnalisé du livre de recettes</DialogTitle>
						<DialogDescription>
							Configurez les filtres pour générer votre export comptable au
							format CSV.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Type de période */}
						<div className="grid gap-2">
							<Label htmlFor="periodType">Type de période</Label>
							<Select
								value={periodType}
								onValueChange={(value) =>
									setPeriodType(value as "all" | "year" | "month" | "custom")
								}
							>
								<SelectTrigger id="periodType">
									<SelectValue placeholder="Sélectionnez une période" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Toutes les factures</SelectItem>
									<SelectItem value="year">Année complète</SelectItem>
									<SelectItem value="month">Mois spécifique</SelectItem>
									<SelectItem value="custom">Période personnalisée</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Année (si year ou month) */}
						{(periodType === "year" || periodType === "month") && (
							<div className="grid gap-2">
								<Label htmlFor="year">Année</Label>
								<Input
									id="year"
									type="number"
									min="2020"
									max="2100"
									value={year}
									onChange={(e) => setYear(e.target.value)}
								/>
							</div>
						)}

						{/* Mois (si month) */}
						{periodType === "month" && (
							<div className="grid gap-2">
								<Label htmlFor="month">Mois</Label>
								<Select value={month} onValueChange={setMonth}>
									<SelectTrigger id="month">
										<SelectValue placeholder="Sélectionnez un mois" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="1">Janvier</SelectItem>
										<SelectItem value="2">Février</SelectItem>
										<SelectItem value="3">Mars</SelectItem>
										<SelectItem value="4">Avril</SelectItem>
										<SelectItem value="5">Mai</SelectItem>
										<SelectItem value="6">Juin</SelectItem>
										<SelectItem value="7">Juillet</SelectItem>
										<SelectItem value="8">Août</SelectItem>
										<SelectItem value="9">Septembre</SelectItem>
										<SelectItem value="10">Octobre</SelectItem>
										<SelectItem value="11">Novembre</SelectItem>
										<SelectItem value="12">Décembre</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Dates custom */}
						{periodType === "custom" && (
							<>
								<div className="grid gap-2">
									<Label htmlFor="dateFrom">Date de début</Label>
									<Input
										id="dateFrom"
										type="date"
										value={dateFrom}
										onChange={(e) => setDateFrom(e.target.value)}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="dateTo">Date de fin</Label>
									<Input
										id="dateTo"
										type="date"
										value={dateTo}
										onChange={(e) => setDateTo(e.target.value)}
									/>
								</div>
							</>
						)}

						{/* Statut des factures */}
						<div className="grid gap-2">
							<Label htmlFor="invoiceStatus">Statut des factures</Label>
							<Select
								value={invoiceStatus}
								onValueChange={(value) =>
									setInvoiceStatus(value as "all" | "sent" | "archived")
								}
							>
								<SelectTrigger id="invoiceStatus">
									<SelectValue placeholder="Sélectionnez un statut" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										Toutes (envoyées + archivées)
									</SelectItem>
									<SelectItem value="sent">Seulement envoyées</SelectItem>
									<SelectItem value="archived">Seulement archivées</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Message d'erreur */}
						{state.status === ActionStatus.ERROR && (
							<div className="text-sm text-destructive">{state.message}</div>
						)}

						{/* Message de succès */}
						{state.status === ActionStatus.SUCCESS && (
							<div className="text-sm text-secondary-foreground flex items-center gap-2">
								<CheckCircle2 className="w-4 h-4" />
								{state.message}
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setDialogOpen(false)}
							disabled={isPending}
						>
							Annuler
						</Button>
						<Button onClick={handleCustomExport} disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Export...
								</>
							) : (
								<>
									<Download className="w-4 h-4 mr-2" />
									Exporter CSV
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
