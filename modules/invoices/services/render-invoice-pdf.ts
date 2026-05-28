import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import type { InvoiceData, StructuredAddress } from "../types/invoice-data";

/**
 * Rend l'objet pivot `InvoiceData` en PDF A4.
 *
 * À l'inverse de l'ancien `generate-invoice-pdf` qui prenait un `Order` Prisma,
 * ce renderer ne lit QUE `InvoiceData`. Conséquence : le même payload alimentera
 * les futurs renderers Factur-X / UBL / CII sans refactor de la source de
 * vérité — c'est l'objectif de l'extraction en module `modules/invoices/`.
 *
 * **Déterminisme bit-à-bit (Art. L102 B LPF)** : deux appels avec le même
 * `InvoiceData` produisent le même SHA-256. Cf. `renderInvoicePdf.deterministic`
 * régression test. Les sources de non-déterminisme jsPDF sont neutralisées :
 *   - `/CreationDate` figée via `setCreationDate(data.issuedAt)`
 *   - `/ID` figé via `setFileId` dérivé md5(invoiceNumber + issuedAt)
 *   - Propriétés document figées (creator, producer, title)
 *   - Dates rendues via `formatDateDeterministic` sans `Intl` (drift ICU)
 */
export function renderInvoicePdf(data: InvoiceData): ArrayBuffer {
	const isCreditNote = data.invoiceNumber.startsWith("A-");
	const doc = new jsPDF({ unit: "mm", format: "a4" });

	// === Métadonnées déterministes (avant tout write) ===
	const issuedAt = coerceDate(data.issuedAt);
	doc.setCreationDate(issuedAt);
	doc.setFileId(deriveFileId(data.invoiceNumber, issuedAt));
	doc.setProperties({
		title: `${isCreditNote ? "Avoir" : "Facture"} ${data.invoiceNumber}`,
		subject: isCreditNote
			? `Avoir Synclune ${data.invoiceNumber}`
			: `Facture Synclune ${data.invoiceNumber}`,
		author: data.seller.legalName,
		creator: "Synclune Invoice Engine",
		keywords: data.invoiceNumber,
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 20;
	const contentWidth = pageWidth - margin * 2;
	let y = margin;

	// === Header — vendeur ===
	doc.setFontSize(22);
	doc.setFont("helvetica", "bold");
	doc.text(data.seller.tradeName, margin, y);
	y += 8;

	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(data.seller.legalName, margin, y);
	y += 4;
	doc.text(formatSellerAddress(data.seller.address), margin, y);
	y += 4;
	doc.text(`SIRET : ${formatSiretForDisplay(data.seller.siret)}`, margin, y);
	y += 4;
	if (data.seller.vatNumber) {
		doc.text(`TVA intra. : ${data.seller.vatNumber}`, margin, y);
		y += 4;
	}
	doc.text(data.seller.email, margin, y);

	// === Title — droite ===
	doc.setTextColor(0, 0, 0);
	doc.setFontSize(16);
	doc.setFont("helvetica", "bold");
	const title = isCreditNote ? "AVOIR" : "FACTURE";
	const titleWidth = doc.getTextWidth(title);
	doc.text(title, pageWidth - margin - titleWidth, margin);

	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	const refLine = `N° : ${data.invoiceNumber}`;
	const dateLine = `Date : ${formatDate(data.issuedAt)}`;
	const orderLine = `Commande : ${data.meta.orderNumber}`;
	doc.text(refLine, pageWidth - margin - doc.getTextWidth(refLine), margin + 8);
	doc.text(dateLine, pageWidth - margin - doc.getTextWidth(dateLine), margin + 12);
	doc.text(orderLine, pageWidth - margin - doc.getTextWidth(orderLine), margin + 16);

	// Date de paiement visible (Art. 242 nonies A annexe II CGI 9° :
	// la date d'opération et les conditions de paiement doivent être lisibles).
	// Doublonné en mentions légales pour les avoirs (paidAt facture originale).
	if (data.payment.paidAt && !isCreditNote) {
		const paidLine = `Payé le : ${formatDate(data.payment.paidAt)}`;
		doc.text(paidLine, pageWidth - margin - doc.getTextWidth(paidLine), margin + 20);
	}

	// Pour les avoirs : référence à la facture annulée (Art. 272-I CGI)
	if (data.precedingInvoice) {
		const refOrig = `Facture annulée : ${data.precedingInvoice.invoiceNumber}`;
		doc.text(refOrig, pageWidth - margin - doc.getTextWidth(refOrig), margin + 20);
	}

	y += 10;

	// EINV-SEC-007 : bandeau ANNULÉE sur les factures voidées (Art. 272-I CGI).
	// Le PDF original archivé sur UploadThing reste accessible via invoicePdfUrl
	// pour preuve historique (L102 B LPF), mais la route /invoice sert désormais
	// cette version surchargée pour éviter qu'un client n'attache une facture
	// VALIDE-apparente à sa déclaration fiscale alors qu'elle est annulée.
	if (data.voidedInfo) {
		const banner = `FACTURE ANNULÉE — Avoir N° ${data.voidedInfo.creditNoteNumber} émis le ${formatDate(data.voidedInfo.voidedAt)}`;
		doc.setFillColor(254, 226, 226); // red-100
		doc.setDrawColor(220, 38, 38); // red-600
		doc.setLineWidth(0.8);
		doc.rect(margin, y, contentWidth, 12, "FD");
		doc.setTextColor(153, 27, 27); // red-800
		doc.setFontSize(11);
		doc.setFont("helvetica", "bold");
		const bannerWidth = doc.getTextWidth(banner);
		doc.text(banner, margin + (contentWidth - bannerWidth) / 2, y + 8);
		doc.setTextColor(0, 0, 0);
		doc.setLineWidth(0.5);
		doc.setDrawColor(220, 220, 220);
		y += 18;
	}

	doc.setDrawColor(220, 220, 220);
	doc.setLineWidth(0.5);
	doc.line(margin, y, pageWidth - margin, y);
	y += 10;

	// === Client (Art. 289 CGI : nom complet + adresse de facturation) ===
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.text("Facturé à :", margin, y);
	y += 5;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);

	// Pour B2B/B2G : raison sociale en première ligne
	if (data.buyer.legalName) {
		doc.setFont("helvetica", "bold");
		doc.text(data.buyer.legalName, margin, y);
		doc.setFont("helvetica", "normal");
		y += 4;
	}

	doc.text(data.billingAddress.recipientName, margin, y);
	y += 4;
	doc.text(data.billingAddress.line1, margin, y);
	y += 4;
	if (data.billingAddress.line2) {
		doc.text(data.billingAddress.line2, margin, y);
		y += 4;
	}
	doc.text(`${data.billingAddress.postalCode} ${data.billingAddress.city}`, margin, y);
	y += 4;
	if (data.buyer.email) {
		doc.text(data.buyer.email, margin, y);
		y += 4;
	}
	// B2B : afficher SIRET/TVA pour conformité Art. 289
	if (data.buyer.siret) {
		doc.setTextColor(120, 120, 120);
		doc.text(`SIRET : ${data.buyer.siret}`, margin, y);
		doc.setTextColor(0, 0, 0);
		y += 4;
	}
	if (data.buyer.vatNumber) {
		doc.setTextColor(120, 120, 120);
		doc.text(`TVA : ${data.buyer.vatNumber}`, margin, y);
		doc.setTextColor(0, 0, 0);
		y += 4;
	}
	y += 8;

	// === Lignes ===
	const colX = {
		description: margin,
		qty: margin + contentWidth * 0.6,
		unitPrice: margin + contentWidth * 0.72,
		total: margin + contentWidth * 0.88,
	};

	doc.setFillColor(245, 245, 245);
	doc.rect(margin, y - 4, contentWidth, 8, "F");
	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	doc.text("Description", colX.description + 2, y);
	doc.text("Qté", colX.qty, y);
	doc.text("Prix unit.", colX.unitPrice, y);
	doc.text("Total", colX.total, y);
	y += 8;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	for (const line of data.lines) {
		const variant = [line.variantInfo.color, line.variantInfo.material, line.variantInfo.size]
			.filter(Boolean)
			.join(" / ");

		doc.text(line.productTitle, colX.description + 2, y);
		if (variant) {
			doc.setTextColor(100, 100, 100);
			doc.text(variant, colX.description + 2, y + 3.5);
			doc.setTextColor(0, 0, 0);
		}
		doc.text(String(line.quantity), colX.qty, y);
		doc.text(formatEuro(line.unitPriceExclTax), colX.unitPrice, y);
		doc.text(formatEuro(line.lineTotalInclTax), colX.total, y);
		y += variant ? 9 : 6;
	}

	y += 4;
	doc.setDrawColor(220, 220, 220);
	doc.line(margin, y, pageWidth - margin, y);
	y += 8;

	// === Totaux ===
	const totalsX = margin + contentWidth * 0.6;
	doc.setFontSize(9);

	doc.text("Sous-total", totalsX, y);
	doc.text(formatEuro(data.totals.subtotalExclTax), colX.total, y);
	y += 5;

	if (data.totals.totalDiscount > 0) {
		doc.text("Réduction", totalsX, y);
		doc.text(`-${formatEuro(data.totals.totalDiscount)}`, colX.total, y);
		y += 5;
	}

	doc.text("Frais de livraison", totalsX, y);
	doc.text(
		data.totals.shippingExclTax === 0 ? "Offerts" : formatEuro(data.totals.shippingExclTax),
		colX.total,
		y,
	);
	y += 5;

	// TVA : afficher "non applicable" en franchise, sinon le montant
	if (data.totals.totalTax === 0) {
		doc.text("TVA (non applicable)", totalsX, y);
		doc.text("—", colX.total, y);
	} else {
		doc.text("TVA", totalsX, y);
		doc.text(formatEuro(data.totals.totalTax), colX.total, y);
	}
	y += 3;

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.3);
	doc.line(totalsX, y, pageWidth - margin, y);
	y += 5;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.text("Total", totalsX, y);
	doc.text(formatEuro(data.totals.totalInclTax), colX.total, y);
	y += 12;

	// === Modalités de paiement (B2B : viré) — affiché seulement si renseigné ===
	if (data.seller.bankIban) {
		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);
		doc.setTextColor(0, 0, 0);
		doc.text("Modalités de paiement", margin, y);
		y += 5;
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.text(`IBAN : ${formatIbanForDisplay(data.seller.bankIban)}`, margin, y);
		y += 4;
		if (data.seller.bankBic) {
			doc.text(`BIC : ${data.seller.bankBic}`, margin, y);
			y += 4;
		}
		y += 4;
	}

	// === Mentions légales ===
	doc.setFont("helvetica", "italic");
	doc.setFontSize(7);
	doc.setTextColor(120, 120, 120);
	if (data.seller.vatExemptionText) {
		doc.text(data.seller.vatExemptionText, margin, y);
		y += 3.5;
	}
	doc.text(`${data.seller.legalForm} (micro-entreprise) — ${data.seller.legalName}`, margin, y);
	y += 3.5;
	if (data.payment.paidAt) {
		doc.text(`Paiement reçu le ${formatDate(data.payment.paidAt)}`, margin, y);
	}

	// Pour les avoirs, mentionner explicitement la facture annulée
	if (data.precedingInvoice) {
		y += 3.5;
		doc.text(
			`Avoir émis suite à : ${data.precedingInvoice.reason} (facture ${data.precedingInvoice.invoiceNumber}).`,
			margin,
			y,
		);
	}

	return doc.output("arraybuffer");
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formate un montant en centimes au format français `N NNN,NN €` SANS `Intl`
 * (l'espace insécable Intl a basculé U+00A0 → U+202F entre versions Node, source
 * de divergence bit-à-bit du PDF archivé).
 */
function formatEuro(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(Math.round(cents));
	const euros = Math.floor(abs / 100);
	const remainder = abs % 100;
	const eurosFormatted = euros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	const centsFormatted = remainder.toString().padStart(2, "0");
	return `${sign}${eurosFormatted},${centsFormatted} €`;
}

const FRENCH_MONTHS = [
	"janvier",
	"février",
	"mars",
	"avril",
	"mai",
	"juin",
	"juillet",
	"août",
	"septembre",
	"octobre",
	"novembre",
	"décembre",
] as const;

/**
 * Formate une date au format `D mois YYYY` en français SANS recourir à `Intl`
 * (l'output `Intl.DateTimeFormat` peut dériver entre versions Node/ICU :
 * espace insécable U+202F vs U+00A0, casing du mois). Crucial pour garantir
 * le déterminisme bit-à-bit du PDF archivé sur 10 ans (Art. L102 B LPF).
 *
 * Utilise `getUTC*` pour neutraliser le timezone serveur (Vercel cold-start
 * en UTC mais dev local potentiellement en Europe/Paris).
 */
function formatDateDeterministic(date: Date): string {
	const d = date.getUTCDate();
	const m = FRENCH_MONTHS[date.getUTCMonth()];
	const y = date.getUTCFullYear();
	return `${d} ${m} ${y}`;
}

function formatDate(date: Date | string): string {
	return formatDateDeterministic(coerceDate(date));
}

function coerceDate(value: Date | string): Date {
	return value instanceof Date ? value : new Date(value);
}

/**
 * Dérive un `/ID` PDF déterministe (32 hex chars uppercase) depuis le numéro
 * de facture + sa date d'émission. Identique pour 2 appels successifs avec
 * le même `InvoiceData`.
 */
function deriveFileId(invoiceNumber: string, issuedAt: Date): string {
	return createHash("md5")
		.update(`${invoiceNumber}|${issuedAt.toISOString()}`)
		.digest("hex")
		.toUpperCase();
}

function formatSellerAddress(addr: StructuredAddress): string {
	const parts = [addr.line1];
	if (addr.line2) parts.push(addr.line2);
	parts.push(`${addr.postalCode} ${addr.city}`);
	parts.push(addr.countryCode === "FR" ? "France" : addr.countryCode);
	return parts.join(", ");
}

/**
 * Re-formate un SIRET canonique (14 chiffres) en format INSEE lisible
 * `NNN NNN NNN NNNNN` pour l'affichage PDF. Le stockage reste canonique.
 */
function formatSiretForDisplay(siret: string): string {
	if (siret.length !== 14) return siret;
	return `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`;
}

/**
 * Affiche un IBAN par blocs de 4 caractères pour lisibilité (norme ISO 13616).
 * Le stockage canonique reste sans espaces (validation Zod).
 */
function formatIbanForDisplay(iban: string): string {
	return iban.replace(/(.{4})/g, "$1 ").trim();
}
