"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { toast } from "@/shared/utils/toast";
import type { DashboardPeriod } from "../constants/period.constants";
import { getPeriodBoundaries } from "../services/period-boundaries.service";

interface ExportRevenueButtonProps {
	period: DashboardPeriod;
}

function buildExportUrl(period: DashboardPeriod): string {
	const params = new URLSearchParams();
	const now = new Date();

	if (period === "month") {
		params.set("periodType", "month");
		params.set("year", String(now.getFullYear()));
		params.set("month", String(now.getMonth() + 1));
	} else if (period === "year") {
		params.set("periodType", "year");
		params.set("year", String(now.getFullYear()));
	} else {
		const { currentStart, currentEnd } = getPeriodBoundaries(period);
		params.set("periodType", "custom");
		params.set("dateFrom", currentStart.toISOString().slice(0, 10));
		params.set("dateTo", currentEnd.toISOString().slice(0, 10));
	}

	return `/api/admin/orders/export?${params.toString()}`;
}

function parseFilename(response: Response): string {
	const disposition = response.headers.get("Content-Disposition");
	return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "livre-recettes.csv";
}

async function downloadCsv(url: string): Promise<void> {
	const response = await fetch(url);
	if (!response.ok) {
		const data = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(data?.error ?? "Erreur lors de l'export");
	}
	const blob = await response.blob();
	const blobUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = parseFilename(response);
	link.click();
	URL.revokeObjectURL(blobUrl);
}

export function ExportRevenueButton({ period }: ExportRevenueButtonProps) {
	const [isExporting, setIsExporting] = useState(false);

	async function handleClick() {
		if (isExporting) return;
		triggerHaptic("medium");
		setIsExporting(true);

		const task = downloadCsv(buildExportUrl(period));

		toast.promise(task, {
			loading: "Génération du livre de recettes…",
			success: "Export téléchargé",
			error: (err) => (err instanceof Error ? err.message : "Erreur lors de l'export"),
		});

		try {
			await task;
			triggerHaptic("success");
		} catch {
			triggerHaptic("error");
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleClick}
			disabled={isExporting}
			aria-label="Exporter le livre de recettes au format CSV"
			data-pending={isExporting || undefined}
			aria-busy={isExporting || undefined}
			className="gap-2"
		>
			{isExporting ? (
				<LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
			) : (
				<Download className="h-4 w-4" aria-hidden="true" />
			)}
			<span className="hidden sm:inline">Exporter</span>
		</Button>
	);
}
