import type { ExportInvoicesInput } from "../schemas/order.schemas";

interface ExportableOrder {
	orderNumber: string;
	invoiceNumber: string | null;
	createdAt: Date;
	paidAt: Date | null;
	customerName: string;
	customerEmail: string;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	total: number;
	paymentMethod: string;
	paymentStatus: string;
	status: string;
}

/**
 * Builds the Prisma where clause for the export query based on period filters
 */
export function buildExportWhereClause(input: ExportInvoicesInput) {
	const where: Record<string, unknown> = {
		paymentStatus: "PAID",
		deletedAt: null,
	};

	if (input.periodType === "year" && input.year) {
		where.paidAt = {
			gte: new Date(input.year, 0, 1),
			lt: new Date(input.year + 1, 0, 1),
		};
	} else if (input.periodType === "month" && input.year && input.month) {
		where.paidAt = {
			gte: new Date(input.year, input.month - 1, 1),
			lt: new Date(input.year, input.month, 1),
		};
	} else if (input.periodType === "custom" && input.dateFrom && input.dateTo) {
		where.paidAt = {
			gte: input.dateFrom,
			lte: input.dateTo,
		};
	}

	if (input.invoiceStatus && input.invoiceStatus !== "all") {
		where.invoiceStatus = input.invoiceStatus === "sent" ? "GENERATED" : "VOIDED";
	}

	return where;
}

/**
 * Generates a CSV string from an array of exportable orders
 * Format: "Livre de recettes" compliant with Article 286 CGI
 */
export function generateOrdersCsv(orders: ExportableOrder[]): string {
	const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
	const SEP = ";"; // Semicolon separator for French locale

	const headers = [
		"N° Facture",
		"N° Commande",
		"Date paiement",
		"Client",
		"Email",
		"Sous-total HT",
		"Réduction",
		"Livraison",
		"Total TTC",
		"Moyen de paiement",
		"Statut paiement",
		"Statut commande",
	];

	const rows = orders.map((order) => [
		order.invoiceNumber ?? "",
		order.orderNumber,
		order.paidAt ? formatDateCsv(order.paidAt) : "",
		escapeCsv(order.customerName),
		order.customerEmail,
		formatEuroCsv(order.subtotal),
		formatEuroCsv(order.discountAmount),
		formatEuroCsv(order.shippingCost),
		formatEuroCsv(order.total),
		order.paymentMethod,
		order.paymentStatus,
		order.status,
	]);

	const csvContent = [
		headers.join(SEP),
		...rows.map((row) => row.join(SEP)),
	].join("\n");

	return BOM + csvContent;
}

function formatDateCsv(date: Date): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

function formatEuroCsv(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",");
}

function escapeCsv(value: string): string {
	if (value.includes(";") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
