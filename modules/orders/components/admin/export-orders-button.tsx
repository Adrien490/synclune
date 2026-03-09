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
import { useReducer } from "react";
import { toast } from "sonner";

type PeriodType = "all" | "year" | "month" | "custom";

type ExportState = {
	open: boolean;
	isExporting: boolean;
	periodType: PeriodType;
	year: string;
	month: string;
	dateFrom: string;
	dateTo: string;
};

type ExportAction =
	| { type: "SET_OPEN"; open: boolean }
	| { type: "SET_EXPORTING"; isExporting: boolean }
	| { type: "SET_PERIOD_TYPE"; periodType: PeriodType }
	| { type: "SET_YEAR"; year: string }
	| { type: "SET_MONTH"; month: string }
	| { type: "SET_DATE_FROM"; dateFrom: string }
	| { type: "SET_DATE_TO"; dateTo: string };

function exportReducer(state: ExportState, action: ExportAction): ExportState {
	switch (action.type) {
		case "SET_OPEN":
			return { ...state, open: action.open };
		case "SET_EXPORTING":
			return { ...state, isExporting: action.isExporting };
		case "SET_PERIOD_TYPE":
			return { ...state, periodType: action.periodType };
		case "SET_YEAR":
			return { ...state, year: action.year };
		case "SET_MONTH":
			return { ...state, month: action.month };
		case "SET_DATE_FROM":
			return { ...state, dateFrom: action.dateFrom };
		case "SET_DATE_TO":
			return { ...state, dateTo: action.dateTo };
	}
}

function parseExportFilename(response: Response): string {
	const disposition = response.headers.get("Content-Disposition");
	return disposition?.match(/filename="(.+)"/)?.[1] ?? "export.csv";
}

export function ExportOrdersButton() {
	const [state, dispatch] = useReducer(exportReducer, {
		open: false,
		isExporting: false,
		periodType: "all" as PeriodType,
		year: String(new Date().getFullYear()),
		month: String(new Date().getMonth() + 1),
		dateFrom: "",
		dateTo: "",
	});

	async function handleExport() {
		dispatch({ type: "SET_EXPORTING", isExporting: true });
		const params = new URLSearchParams({ periodType: state.periodType });

		if (state.periodType === "year" || state.periodType === "month") {
			params.set("year", state.year);
		}
		if (state.periodType === "month") {
			params.set("month", state.month);
		}
		if (state.periodType === "custom") {
			if (!state.dateFrom || !state.dateTo) {
				toast.error("Veuillez renseigner les dates de début et de fin");
				dispatch({ type: "SET_EXPORTING", isExporting: false });
				return;
			}
			params.set("dateFrom", state.dateFrom);
			params.set("dateTo", state.dateTo);
		}

		try {
			const response = await fetch(`/api/admin/orders/export?${params}`);

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { error?: string } | null;
				toast.error(data?.error ?? "Erreur lors de l'export");
				dispatch({ type: "SET_EXPORTING", isExporting: false });
				return;
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = parseExportFilename(response);
			link.click();
			URL.revokeObjectURL(url);

			toast.success("Export téléchargé");
			dispatch({ type: "SET_OPEN", open: false });
			dispatch({ type: "SET_EXPORTING", isExporting: false });
		} catch {
			toast.error("Erreur lors de l'export");
			dispatch({ type: "SET_EXPORTING", isExporting: false });
		}
	}

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: currentYear - 2023 }, (_, i) => String(currentYear - i));

	return (
		<Dialog open={state.open} onOpenChange={(open) => dispatch({ type: "SET_OPEN", open })}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Download className="mr-2 h-4 w-4" />
					Exporter
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Exporter le livre de recettes</DialogTitle>
					<DialogDescription>Export CSV des commandes payées (Article 286 CGI)</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Période</Label>
						<Select
							value={state.periodType}
							onValueChange={(v) =>
								dispatch({ type: "SET_PERIOD_TYPE", periodType: v as PeriodType })
							}
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

					{(state.periodType === "year" || state.periodType === "month") && (
						<div className="space-y-2">
							<Label>Année</Label>
							<Select
								value={state.year}
								onValueChange={(y) => dispatch({ type: "SET_YEAR", year: y })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((y) => (
										<SelectItem key={y} value={y}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{state.periodType === "month" && (
						<div className="space-y-2">
							<Label>Mois</Label>
							<Select
								value={state.month}
								onValueChange={(m) => dispatch({ type: "SET_MONTH", month: m })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 12 }, (_, i) => {
										const m = String(i + 1);
										const label = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
											new Date(2024, i),
										);
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

					{state.periodType === "custom" && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Du</Label>
								<Input
									type="date"
									value={state.dateFrom}
									onChange={(e) => dispatch({ type: "SET_DATE_FROM", dateFrom: e.target.value })}
								/>
							</div>
							<div className="space-y-2">
								<Label>Au</Label>
								<Input
									type="date"
									value={state.dateTo}
									onChange={(e) => dispatch({ type: "SET_DATE_TO", dateTo: e.target.value })}
								/>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => dispatch({ type: "SET_OPEN", open: false })}>
						Annuler
					</Button>
					<Button onClick={handleExport} disabled={state.isExporting}>
						{state.isExporting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Download className="mr-2 h-4 w-4" />
						)}
						{state.isExporting ? "Export en cours..." : "Télécharger CSV"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
