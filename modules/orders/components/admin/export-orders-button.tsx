"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PeriodType = "all" | "year" | "month" | "custom";

export function ExportOrdersButton() {
	const [open, setOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [periodType, setPeriodType] = useState<PeriodType>("all");
	const [year, setYear] = useState(String(new Date().getFullYear()));
	const [month, setMonth] = useState(String(new Date().getMonth() + 1));
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	async function handleExport() {
		setIsExporting(true);
		try {
			const params = new URLSearchParams({ periodType });

			if (periodType === "year" || periodType === "month") {
				params.set("year", year);
			}
			if (periodType === "month") {
				params.set("month", month);
			}
			if (periodType === "custom") {
				if (!dateFrom || !dateTo) {
					toast.error("Veuillez renseigner les dates de début et de fin");
					return;
				}
				params.set("dateFrom", dateFrom);
				params.set("dateTo", dateTo);
			}

			const response = await fetch(`/api/admin/orders/export?${params}`);

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				throw new Error(data?.error ?? "Erreur lors de l'export");
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const disposition = response.headers.get("Content-Disposition");
			const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? "export.csv";
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);

			toast.success("Export téléchargé");
			setOpen(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Erreur lors de l'export");
		} finally {
			setIsExporting(false);
		}
	}

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: currentYear - 2023 }, (_, i) => String(currentYear - i));

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Download className="h-4 w-4 mr-2" />
					Exporter
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Exporter le livre de recettes</DialogTitle>
					<DialogDescription>
						Export CSV des commandes payées (Article 286 CGI)
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Période</Label>
						<Select
							value={periodType}
							onValueChange={(v) => setPeriodType(v as PeriodType)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Toutes les commandes</SelectItem>
								<SelectItem value="year">Par année</SelectItem>
								<SelectItem value="month">Par mois</SelectItem>
								<SelectItem value="custom">Période personnalisée</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{(periodType === "year" || periodType === "month") && (
						<div className="space-y-2">
							<Label>Année</Label>
							<Select value={year} onValueChange={setYear}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={y}>{y}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{periodType === "month" && (
						<div className="space-y-2">
							<Label>Mois</Label>
							<Select value={month} onValueChange={setMonth}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 12 }, (_, i) => {
										const m = String(i + 1);
										const label = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date(2024, i));
										return (
											<SelectItem key={m} value={m}>
												{label.charAt(0).toUpperCase() + label.slice(1)}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>
					)}

					{periodType === "custom" && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Du</Label>
								<Input
									type="date"
									value={dateFrom}
									onChange={(e) => setDateFrom(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Au</Label>
								<Input
									type="date"
									value={dateTo}
									onChange={(e) => setDateTo(e.target.value)}
								/>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Annuler
					</Button>
					<Button onClick={handleExport} disabled={isExporting}>
						{isExporting ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Download className="h-4 w-4 mr-2" />
						)}
						{isExporting ? "Export en cours..." : "Télécharger CSV"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
