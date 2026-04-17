import type { ExportProductTypesFormat } from "../schemas/product-type.schemas";

// ============================================================================
// EXPORT BUILDER SERVICE
// Fonctions pures qui assemblent les donnees ProductType en payload CSV / JSON
// ============================================================================

export type ProductTypeExportRow = {
	label: string;
	slug: string;
	description: string | null;
	isActive: boolean;
	isSystem: boolean;
	productsCount: number;
	customizationsCount: number;
	createdAt: Date;
};

export type ProductTypeExportPayload = {
	filename: string;
	mimeType: string;
	content: string;
};

const DATE_FORMATTER_PARTS = new Intl.DateTimeFormat("en-CA", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	timeZone: "UTC",
});

function toIsoDate(date: Date): string {
	return DATE_FORMATTER_PARTS.format(date);
}

/**
 * CSV-escape une cellule (RFC 4180): quote si la valeur contient un separateur,
 * un guillemet, un saut de ligne ou des espaces en debut/fin. Double les guillemets internes.
 */
export function escapeCsvCell(raw: string | number | boolean | null | undefined): string {
	if (raw === null || raw === undefined) return "";
	const value = typeof raw === "boolean" ? (raw ? "true" : "false") : String(raw);
	const needsQuoting = /[",\r\n]/.test(value) || /^\s|\s$/.test(value);
	if (!needsQuoting) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

function rowToCsv(row: Array<string | number | boolean | null | undefined>): string {
	return row.map(escapeCsvCell).join(",");
}

function buildCsv(rows: ProductTypeExportRow[]): string {
	const header = rowToCsv([
		"label",
		"slug",
		"description",
		"isActive",
		"isSystem",
		"productsCount",
		"customizationsCount",
		"createdAt",
	]);
	const lines = rows.map((row) =>
		rowToCsv([
			row.label,
			row.slug,
			row.description ?? "",
			row.isActive,
			row.isSystem,
			row.productsCount,
			row.customizationsCount,
			toIsoDate(row.createdAt),
		]),
	);
	return [header, ...lines].join("\n");
}

function buildJson(rows: ProductTypeExportRow[]): string {
	return JSON.stringify(
		{
			generatedAt: new Date().toISOString(),
			count: rows.length,
			productTypes: rows.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString(),
			})),
		},
		null,
		2,
	);
}

export function buildProductTypeExport(
	format: ExportProductTypesFormat,
	rows: ProductTypeExportRow[],
): ProductTypeExportPayload {
	const timestamp = toIsoDate(new Date());
	const baseName = `product-types-${timestamp}`;

	if (format === "json") {
		return {
			filename: `${baseName}.json`,
			mimeType: "application/json;charset=utf-8",
			content: buildJson(rows),
		};
	}

	return {
		filename: `${baseName}.csv`,
		mimeType: "text/csv;charset=utf-8",
		content: buildCsv(rows),
	};
}
