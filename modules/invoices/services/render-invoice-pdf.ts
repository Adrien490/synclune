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
 * Le visuel reste identique à l'ancien rendu pour garantir la stabilité
 * des factures archivées (Art. L102 B LPF — bit-identical between releases).
 */
export function renderInvoicePdf(data: InvoiceData): ArrayBuffer {
	const isCreditNote = data.invoiceNumber.startsWith("A-");
	const doc = new jsPDF({ unit: "mm", format: "a4" });
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

	// Pour les avoirs : référence à la facture annulée (Art. 272-I CGI)
	if (data.precedingInvoice) {
		const refOrig = `Facture annulée : ${data.precedingInvoice.invoiceNumber}`;
		doc.text(refOrig, pageWidth - margin - doc.getTextWidth(refOrig), margin + 20);
	}

	y += 10;

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

function formatEuro(cents: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(cents / 100);
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
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
