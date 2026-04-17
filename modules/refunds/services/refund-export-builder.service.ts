import type { RefundReason, RefundStatus } from "@/app/generated/prisma/client";
import type { ExportRefundsFormat, ExportRefundsPeriod } from "../schemas/refund.schemas";
import { REFUND_STATUS_LABELS, REFUND_REASON_LABELS } from "../constants/refund.constants";

// ============================================================================
// REFUND EXPORT BUILDER SERVICE
// Pure functions assembling refund data into CSV / JSON payloads (RFC 4180)
// ============================================================================

export type RefundExportRow = {
	id: string;
	orderNumber: string;
	customerEmail: string | null;
	customerName: string | null;
	amount: number;
	currency: string;
	status: RefundStatus;
	reason: RefundReason;
	stripeRefundId: string | null;
	note: string | null;
	failureReason: string | null;
	createdAt: Date;
	processedAt: Date | null;
	itemCount: number;
};

export type RefundExportPayload = {
	filename: string;
	mimeType: string;
	content: string;
};

const PERIOD_LABELS: Record<ExportRefundsPeriod, string> = {
	"7d": "7 jours",
	"30d": "30 jours",
	month: "Ce mois",
	quarter: "Ce trimestre",
	year: "Cette année",
	all: "Tout",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "UTC",
});

function toIsoDate(date: Date): string {
	return DATE_FORMATTER.format(date);
}

/**
 * RFC 4180 CSV cell escape: quote when value contains separator, quote,
 * newline, or leading/trailing whitespace. Double internal quotes.
 */
export function escapeCsvCell(raw: string | number | null | undefined): string {
	if (raw === null || raw === undefined) return "";
	const value = String(raw);
	const needsQuoting = /[",\r\n]/.test(value) || /^\s|\s$/.test(value);
	if (!needsQuoting) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

function rowToCsv(row: Array<string | number | null | undefined>): string {
	return row.map(escapeCsvCell).join(",");
}

function buildCsv(period: ExportRefundsPeriod, rows: RefundExportRow[]): string {
	const generatedAt = new Date().toISOString();
	const header = [
		`# Export Remboursements Synclune`,
		`# Periode: ${PERIOD_LABELS[period]}`,
		`# Genere: ${generatedAt}`,
		`# Nombre: ${rows.length}`,
		"",
	];

	const csvHeader = rowToCsv([
		"ID",
		"N° Commande",
		"Email client",
		"Nom client",
		"Montant (centimes)",
		"Devise",
		"Statut",
		"Motif",
		"Stripe Refund ID",
		"Note",
		"Raison d'echec",
		"Cree le",
		"Traite le",
		"Nb articles",
	]);

	const csvRows = rows.map((row) =>
		rowToCsv([
			row.id,
			row.orderNumber,
			row.customerEmail,
			row.customerName,
			row.amount,
			row.currency,
			REFUND_STATUS_LABELS[row.status],
			REFUND_REASON_LABELS[row.reason],
			row.stripeRefundId,
			row.note,
			row.failureReason,
			row.createdAt.toISOString(),
			row.processedAt ? row.processedAt.toISOString() : null,
			row.itemCount,
		]),
	);

	return [...header, csvHeader, ...csvRows, ""].join("\n");
}

function buildJson(period: ExportRefundsPeriod, rows: RefundExportRow[]): string {
	return JSON.stringify(
		{
			period,
			periodLabel: PERIOD_LABELS[period],
			generatedAt: new Date().toISOString(),
			count: rows.length,
			refunds: rows.map((row) => ({
				...row,
				statusLabel: REFUND_STATUS_LABELS[row.status],
				reasonLabel: REFUND_REASON_LABELS[row.reason],
				createdAt: row.createdAt.toISOString(),
				processedAt: row.processedAt ? row.processedAt.toISOString() : null,
			})),
		},
		null,
		2,
	);
}

export function buildRefundExport(
	period: ExportRefundsPeriod,
	format: ExportRefundsFormat,
	rows: RefundExportRow[],
): RefundExportPayload {
	const timestamp = toIsoDate(new Date());
	const baseName = `remboursements-${period}-${timestamp}`;

	if (format === "json") {
		return {
			filename: `${baseName}.json`,
			mimeType: "application/json;charset=utf-8",
			content: buildJson(period, rows),
		};
	}

	return {
		filename: `${baseName}.csv`,
		mimeType: "text/csv;charset=utf-8",
		content: buildCsv(period, rows),
	};
}

/**
 * Computes the start date for a given period, or null for "all".
 * Used by data layer to build WHERE clause.
 */
export function getPeriodStartDate(
	period: ExportRefundsPeriod,
	now: Date = new Date(),
): Date | null {
	if (period === "all") return null;
	const start = new Date(now);
	switch (period) {
		case "7d":
			start.setDate(start.getDate() - 7);
			return start;
		case "30d":
			start.setDate(start.getDate() - 30);
			return start;
		case "month":
			return new Date(now.getFullYear(), now.getMonth(), 1);
		case "quarter": {
			const quarter = Math.floor(now.getMonth() / 3);
			return new Date(now.getFullYear(), quarter * 3, 1);
		}
		case "year":
			return new Date(now.getFullYear(), 0, 1);
	}
}
