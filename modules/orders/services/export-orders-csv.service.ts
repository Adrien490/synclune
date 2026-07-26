import type { Prisma } from "@/app/generated/prisma/client";
import { InvoiceStatus } from "@/app/generated/prisma/client";
import { APP_TIME_ZONE, parisWallTimeToUtc } from "@/shared/utils/timezone";
import { PAID_REVENUE_STATUSES } from "../constants/revenue-status.constants";
import type { ExportInvoicesInput } from "../schemas/order.schemas";

interface ExportableOrder {
	orderNumber: string;
	invoiceNumber: string | null;
	creditNoteNumber: string | null;
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
	refunds: { amount: number }[];
}

/**
 * Builds the Prisma where clause for the export query based on period filters.
 *
 * IMPORTANT (ORD-COMPLY-007, audit conformité 2026-05-27) : le filtre
 * périodique porte volontairement sur `paidAt` (date d'encaissement) et non
 * sur `createdAt` (date de commande). En micro-entreprise française (Art. 50-0
 * CGI), le CA est compté à l'encaissement : une commande créée en décembre et
 * payée en janvier doit apparaître dans l'export janvier. NE PAS basculer ce
 * filtre sur `createdAt` sous peine de discordance avec le livre de recettes.
 *
 * IMPORTANT (ANALYTICS-AUDIT-003) : le statut inclut PARTIALLY_REFUNDED /
 * REFUNDED. Une commande remboursée a bien été encaissée et possède un
 * `invoiceNumber` — l'exclure créerait des trous dans la séquence du livre de
 * recettes (Art. 286 CGI). Le remboursement est rendu visible par les colonnes
 * "Remboursé" / "Net encaissé" / "N° Avoir".
 */
export function buildExportWhereClause(input: ExportInvoicesInput): Prisma.OrderWhereInput {
	const where: Prisma.OrderWhereInput = {
		paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
		deletedAt: null,
	};

	// ORD-COMPLY-007 (fix AUDIT-01) : bornes calculées en heure de PARIS, pas dans
	// le fuseau du process (UTC sur Vercel). `new Date(year, 0, 1)` produisait
	// 2026-01-01T00:00:00Z alors que l'année civile française commence à
	// 2025-12-31T23:00:00Z (+1h hiver) — les commandes encaissées entre minuit et
	// 1h du matin Paris au tournant du mois/de l'année étaient comptées sur la
	// mauvaise période du livre de recettes (Art. 50-0 CGI). `parisWallTimeToUtc`
	// est DST-aware (mois 0-indexé ; l'overflow `month=12` → janvier N+1).
	if (input.periodType === "year" && input.year) {
		where.paidAt = {
			gte: parisWallTimeToUtc(input.year, 0, 1),
			lt: parisWallTimeToUtc(input.year + 1, 0, 1),
		};
	} else if (input.periodType === "month" && input.year && input.month) {
		where.paidAt = {
			gte: parisWallTimeToUtc(input.year, input.month - 1, 1),
			lt: parisWallTimeToUtc(input.year, input.month, 1),
		};
	} else if (input.periodType === "custom" && input.dateFrom && input.dateTo) {
		where.paidAt = {
			gte: input.dateFrom,
			lte: input.dateTo,
		};
	}

	if (input.invoiceStatus !== "all") {
		where.invoiceStatus =
			input.invoiceStatus === "sent" ? InvoiceStatus.GENERATED : InvoiceStatus.VOIDED;
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
		"N° Avoir",
		"N° Commande",
		"Date paiement",
		"Client",
		"Email",
		"Sous-total",
		"Réduction",
		"Livraison",
		"Total",
		"Remboursé",
		"Net encaissé",
		"Moyen de paiement",
		"Statut paiement",
		"Statut commande",
	];

	const rows = orders.map((order) => {
		const refundedAmount = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);
		const netAmount = order.total - refundedAmount;

		// ⚠️ TOUTE colonne dont la valeur vient de la base passe par `escapeCsv`.
		// `escapeCsv` n'était appliqué qu'à `customerName` : `customerEmail` est **saisi
		// par le client au checkout** et `z.email()` accepte un local-part à tiret initial
		// (`-x@example.com`), or `-` est justement dans la liste de préfixes de formule
		// d'`escapeCsv`. `paymentMethod` vient de Stripe. Le test « CSV injection » ne
		// couvrait que `customerName`, d'où une fausse impression de couverture.
		//
		// Les colonnes numériques et la date NE sont PAS échappées : elles sont produites
		// par nos propres formatters, et préfixer un montant négatif (`-12,50`) d'une
		// apostrophe le transformerait en texte dans le tableur.
		const text = (value: string | null | undefined) => escapeCsv(value ?? "");

		return [
			text(order.invoiceNumber),
			text(order.creditNoteNumber),
			text(order.orderNumber),
			order.paidAt ? formatDateCsv(order.paidAt) : "",
			text(order.customerName),
			text(order.customerEmail),
			formatEuroCsv(order.subtotal),
			formatEuroCsv(order.discountAmount),
			formatEuroCsv(order.shippingCost),
			formatEuroCsv(order.total),
			formatEuroCsv(refundedAmount),
			formatEuroCsv(netAmount),
			text(order.paymentMethod),
			text(order.paymentStatus),
			text(order.status),
		];
	});

	const csvContent = [headers.join(SEP), ...rows.map((row) => row.join(SEP))].join("\n");

	return BOM + csvContent;
}

// Formatter hoisté : appelé une fois par ligne de l'export (potentiellement des
// milliers), et construire un `Intl.DateTimeFormat` coûte cher.
const CSV_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: APP_TIME_ZONE,
});

function formatDateCsv(date: Date): string {
	return CSV_DATE_FORMATTER.format(date);
}

function formatEuroCsv(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",");
}

function escapeCsv(value: string): string {
	// Protect against CSV injection (formula prefixes)
	const formulaPrefixes = ["=", "+", "-", "@", "\t", "\r"];
	let safe = value;
	if (formulaPrefixes.some((prefix) => safe.startsWith(prefix))) {
		safe = `'${safe}`;
	}
	if (safe.includes(";") || safe.includes('"') || safe.includes("\n")) {
		return `"${safe.replace(/"/g, '""')}"`;
	}
	return safe;
}
