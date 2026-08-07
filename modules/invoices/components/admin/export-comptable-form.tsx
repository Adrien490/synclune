"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useTransition } from "react";
import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/utils/toast";

/**
 * Années proposées à l'export. Calculé à l'appel (et non au scope du module) :
 * un `new Date()` au chargement du module reste figé pour tout le process serveur
 * — le 1ᵉʳ janvier, l'admin ne verrait pas la nouvelle année.
 */
function getAvailableYears(): number[] {
	const currentYear = new Date().getFullYear();
	return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
}

type InvoiceStatusFilter = "all" | "sent" | "archived";

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatusFilter; label: string }[] = [
	{ value: "all", label: "Toutes" },
	{ value: "sent", label: "Émises (GENERATED)" },
	{ value: "archived", label: "Annulées avoir (VOIDED)" },
];

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
	const availableYears = getAvailableYears();
	// L'export est un bouton, pas un submit : `useAppForm` n'a donc pas de
	// `isSubmitting` à réutiliser, et c'est `useTransition` qui fournit le drapeau
	// d'attente — pas un booléen fait main doublé d'un `try/catch` tenant lieu de
	// `finally` (bail-out React Compiler sur TryStatement + finalizer).
	const [isExporting, startExport] = useTransition();

	const form = useAppForm({
		defaultValues: {
			year: String(availableYears[0]),
			invoiceStatus: "sent" as InvoiceStatusFilter,
		},
	});

	function handleExport() {
		if (isExporting) return;
		const { year, invoiceStatus } = form.state.values;
		const params = new URLSearchParams({
			periodType: "year",
			year,
			invoiceStatus,
		});
		startExport(async () => {
			const task = (async () => {
				const response = await fetch(`/api/admin/orders/export?${params.toString()}`, {
					method: "POST",
				});
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
			await task.catch(() => {
				// surfaced by toast.promise
			});
		});
	}

	return (
		<div className="border-border space-y-4 rounded-md border p-4">
			<div className="grid gap-4 sm:grid-cols-3">
				<div className="space-y-2">
					<form.AppField name="year">
						{(field) => (
							<field.SelectField
								label="Année"
								options={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
							/>
						)}
					</form.AppField>
				</div>
				<div className="space-y-2">
					<form.AppField name="invoiceStatus">
						{(field) => (
							<field.SelectField label="Statut facture" options={INVOICE_STATUS_OPTIONS} />
						)}
					</form.AppField>
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
							<Spinner presentational />
						) : (
							<DownloadSimpleIcon className="size-4" aria-hidden="true" />
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
