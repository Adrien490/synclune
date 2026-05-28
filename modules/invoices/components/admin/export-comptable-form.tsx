"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { toast } from "@/shared/utils/toast";

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

type InvoiceStatusFilter = "all" | "sent" | "archived";

/**
 * Export comptable du livre de recettes (Art. 286 CGI — filtre `paidAt`).
 *
 * Bouton dashboard facturation (EINV-UI-010). Construit l'URL
 * `/api/admin/orders/export?periodType=year&year=...&invoiceStatus=...` et
 * déclenche le download via attachment HTTP. Le service côté serveur
 * (`buildExportWhereClause`) filtre obligatoirement sur `paymentStatus=PAID`
 * pour rester compatible Art. 50-0 CGI (CA à l'encaissement).
 */
export function ExportComptableForm() {
	const [year, setYear] = useState(String(CURRENT_YEAR));
	const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusFilter>("sent");
	const [isExporting, setIsExporting] = useState(false);

	async function handleExport() {
		if (isExporting) return;
		setIsExporting(true);
		const params = new URLSearchParams({
			periodType: "year",
			year,
			invoiceStatus,
		});
		const task = (async () => {
			const response = await fetch(`/api/admin/orders/export?${params.toString()}`);
			if (!response.ok) {
				const message =
					response.status === 429
						? "Trop d'exports — réessayer dans quelques minutes"
						: "Erreur lors de l'export";
				throw new Error(message);
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `livre-recettes-${year}.csv`;
			link.click();
			URL.revokeObjectURL(url);
		})();
		toast.promise(task, {
			loading: "Génération de l'export…",
			success: "Export téléchargé",
			error: (e) => (e instanceof Error ? e.message : "Export impossible"),
		});
		try {
			await task;
		} catch {
			// surfaced by toast.promise
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<div className="border-border space-y-4 rounded-md border p-4">
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="export-comptable-year">Année</Label>
					<Select value={year} onValueChange={setYear}>
						<SelectTrigger id="export-comptable-year" aria-label="Année d'export">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{AVAILABLE_YEARS.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="export-comptable-status">Statut facture</Label>
					<Select
						value={invoiceStatus}
						onValueChange={(v) => setInvoiceStatus(v as InvoiceStatusFilter)}
					>
						<SelectTrigger id="export-comptable-status" aria-label="Filtre statut facture">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Toutes</SelectItem>
							<SelectItem value="sent">Émises (GENERATED)</SelectItem>
							<SelectItem value="archived">Annulées avoir (VOIDED)</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-end">
					<Button
						type="button"
						onClick={handleExport}
						disabled={isExporting}
						aria-busy={isExporting || undefined}
						className="w-full"
					>
						{isExporting ? (
							<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<Download className="size-4" aria-hidden="true" />
						)}
						{isExporting ? "Export…" : "Exporter CSV"}
					</Button>
				</div>
			</div>
			<p className="text-muted-foreground text-xs">
				Filtre obligatoire sur la date de paiement (
				<code className="bg-muted rounded px-1 py-0.5">paidAt</code>) — Art. 50-0 CGI (CA à
				l&apos;encaissement). Compatible Excel français (BOM UTF-8 + séparateur{" "}
				<code className="bg-muted rounded px-1 py-0.5">;</code>).
			</p>
		</div>
	);
}
