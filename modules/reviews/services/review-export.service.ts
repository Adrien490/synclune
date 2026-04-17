import type { ReviewExportRow } from "../data/get-reviews-for-export";
import type { ExportReviewsFormat, ExportReviewsPeriod } from "../schemas/review.schemas";

// ============================================================================
// REVIEW EXPORT SERVICE
// Pure functions assembling review rows into CSV / JSON payloads
// ============================================================================

export type ReviewExportPayload = {
	filename: string;
	mimeType: string;
	content: string;
	rowCount: number;
};

const PERIOD_LABELS: Record<ExportReviewsPeriod, string> = {
	"7d": "7 derniers jours",
	"30d": "30 derniers jours",
	"90d": "90 derniers jours",
	year: "12 derniers mois",
	all: "Toutes les periodes",
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
 * CSV-escape a single cell: quote when the value contains a separator,
 * quote, newline, or leading/trailing space. Double internal quotes (RFC 4180).
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

// ----------------------------------------------------------------------------
// CSV BUILD
// ----------------------------------------------------------------------------

const CSV_HEADER = [
	"ID",
	"Date de creation",
	"Date de modification",
	"Date de suppression",
	"Statut",
	"Note",
	"Titre",
	"Contenu",
	"Produit",
	"Slug produit",
	"Auteur",
	"Email auteur",
	"Numero de commande",
	"Demande avis envoyee",
	"Rappel avis envoye",
	"Reponse admin",
	"Auteur reponse",
	"Date reponse",
	"Nombre de photos",
];

function buildRow(row: ReviewExportRow): Array<string | number | null> {
	return [
		row.id,
		row.createdAt.toISOString(),
		row.updatedAt.toISOString(),
		row.deletedAt ? row.deletedAt.toISOString() : "",
		row.status,
		row.rating,
		row.title ?? "",
		row.content,
		row.product?.title ?? "",
		row.product?.slug ?? "",
		row.user?.name ?? "",
		row.user?.email ?? "",
		row.orderItem.order.orderNumber,
		row.orderItem.order.reviewRequestSentAt
			? row.orderItem.order.reviewRequestSentAt.toISOString()
			: "",
		row.orderItem.order.reviewReminderSentAt
			? row.orderItem.order.reviewReminderSentAt.toISOString()
			: "",
		row.response && !row.response.deletedAt ? row.response.content : "",
		row.response && !row.response.deletedAt ? row.response.authorName : "",
		row.response && !row.response.deletedAt ? row.response.createdAt.toISOString() : "",
		row.medias.length,
	];
}

function buildCsv(period: ExportReviewsPeriod, rows: ReviewExportRow[]): string {
	const generatedAt = new Date().toISOString();
	const lines = [
		`# Export avis Synclune`,
		`# Periode: ${PERIOD_LABELS[period]}`,
		`# Genere: ${generatedAt}`,
		`# Total: ${rows.length}`,
		"",
		rowToCsv(CSV_HEADER),
		...rows.map((row) => rowToCsv(buildRow(row))),
		"",
	];
	return lines.join("\n");
}

// ----------------------------------------------------------------------------
// JSON BUILD
// ----------------------------------------------------------------------------

function buildJson(period: ExportReviewsPeriod, rows: ReviewExportRow[]): string {
	return JSON.stringify(
		{
			period,
			periodLabel: PERIOD_LABELS[period],
			generatedAt: new Date().toISOString(),
			total: rows.length,
			reviews: rows.map((row) => ({
				id: row.id,
				rating: row.rating,
				title: row.title,
				content: row.content,
				status: row.status,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				deletedAt: row.deletedAt,
				product: row.product,
				user: row.user,
				orderNumber: row.orderItem.order.orderNumber,
				reviewRequestSentAt: row.orderItem.order.reviewRequestSentAt,
				reviewReminderSentAt: row.orderItem.order.reviewReminderSentAt,
				response:
					row.response && !row.response.deletedAt
						? {
								content: row.response.content,
								authorName: row.response.authorName,
								createdAt: row.response.createdAt,
							}
						: null,
				mediaCount: row.medias.length,
				mediaUrls: row.medias.map((m) => m.url),
			})),
		},
		null,
		2,
	);
}

// ----------------------------------------------------------------------------
// PUBLIC ENTRYPOINT
// ----------------------------------------------------------------------------

export function buildReviewExport(
	period: ExportReviewsPeriod,
	format: ExportReviewsFormat,
	rows: ReviewExportRow[],
): ReviewExportPayload {
	const timestamp = toIsoDate(new Date());
	const baseName = `avis-${period}-${timestamp}`;

	if (format === "json") {
		return {
			filename: `${baseName}.json`,
			mimeType: "application/json;charset=utf-8",
			content: buildJson(period, rows),
			rowCount: rows.length,
		};
	}

	return {
		filename: `${baseName}.csv`,
		mimeType: "text/csv;charset=utf-8",
		content: buildCsv(period, rows),
		rowCount: rows.length,
	};
}
