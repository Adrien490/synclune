import type { Role, AccountStatus } from "@/app/generated/prisma/client";

export type ExportUsersFormat = "csv" | "json";

export type ExportUserRow = {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	accountStatus: AccountStatus;
	createdAt: Date;
	emailVerified: boolean;
	ordersCount: number;
	totalSpent: number;
};

export type UsersListExportPayload = {
	filename: string;
	mimeType: string;
	content: string;
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
 * CSV-escape a single cell per RFC 4180.
 *
 * Exported for unit testing.
 */
export function escapeCsvCell(raw: string | number | boolean | null | undefined): string {
	if (raw === null || raw === undefined) return "";
	const value = String(raw);
	const needsQuoting = /[",\r\n]/.test(value) || /^\s|\s$/.test(value);
	if (!needsQuoting) return value;
	return `"${value.replaceAll('"', '""')}"`;
}

function rowToCsv(row: Array<string | number | boolean | null | undefined>): string {
	return row.map(escapeCsvCell).join(",");
}

function buildCsv(users: ExportUserRow[]): string {
	const generatedAt = new Date().toISOString();
	const meta = [
		`# Export Utilisateurs Synclune`,
		`# Genere: ${generatedAt}`,
		`# Total: ${users.length}`,
		"",
	];

	const header = rowToCsv([
		"ID",
		"Email",
		"Nom",
		"Role",
		"Statut compte",
		"Cree le",
		"Email verifie",
		"Nombre de commandes",
		"Total depense (EUR)",
	]);

	const rows = users.map((u) =>
		rowToCsv([
			u.id,
			u.email,
			u.name ?? "",
			u.role,
			u.accountStatus,
			toIsoDate(u.createdAt),
			u.emailVerified ? "oui" : "non",
			u.ordersCount,
			u.totalSpent.toFixed(2),
		]),
	);

	// UTF-8 BOM prefix so Excel/Numbers detect encoding properly
	return "\uFEFF" + [...meta, header, ...rows].join("\n");
}

function buildJson(users: ExportUserRow[]): string {
	return JSON.stringify(
		{
			generatedAt: new Date().toISOString(),
			total: users.length,
			users: users.map((u) => ({
				id: u.id,
				email: u.email,
				name: u.name,
				role: u.role,
				accountStatus: u.accountStatus,
				createdAt: u.createdAt.toISOString(),
				emailVerified: u.emailVerified,
				ordersCount: u.ordersCount,
				totalSpent: u.totalSpent,
			})),
		},
		null,
		2,
	);
}

export function buildUsersListExport(
	format: ExportUsersFormat,
	users: ExportUserRow[],
): UsersListExportPayload {
	const timestamp = toIsoDate(new Date());
	const baseName = `users-${timestamp}`;

	if (format === "json") {
		return {
			filename: `${baseName}.json`,
			mimeType: "application/json;charset=utf-8",
			content: buildJson(users),
		};
	}

	return {
		filename: `${baseName}.csv`,
		mimeType: "text/csv;charset=utf-8",
		content: buildCsv(users),
	};
}
