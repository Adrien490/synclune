import { jsPDF } from "jspdf";
import type { GetOrderReturn } from "../types/order.types";

const COMPANY = {
	name: "Synclune",
	legalName: "TADDEI LEANE",
	address: "77 Boulevard du Tertre",
	postalCode: "44100",
	city: "Nantes",
	country: "France",
	siret: "839 183 027 00037",
	tvaIntra: "FR35839183027",
	email: "contact@synclune.fr",
} as const;

function formatEuroPdf(cents: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(cents / 100);
}

function formatDatePdf(date: Date): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
}

/**
 * Generates a PDF invoice for a paid order
 * Uses the persisted invoiceNumber if available, falls back to orderNumber
 * Returns the PDF as an ArrayBuffer
 */
export function generateInvoicePdf(order: GetOrderReturn): ArrayBuffer {
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 20;
	const contentWidth = pageWidth - margin * 2;
	let y = margin;

	// Header - Company name
	doc.setFontSize(22);
	doc.setFont("helvetica", "bold");
	doc.text(COMPANY.name, margin, y);
	y += 8;

	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(COMPANY.legalName, margin, y);
	y += 4;
	doc.text(`${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}`, margin, y);
	y += 4;
	doc.text(`SIRET : ${COMPANY.siret}`, margin, y);
	y += 4;
	doc.text(`TVA intra. : ${COMPANY.tvaIntra}`, margin, y);
	y += 4;
	doc.text(COMPANY.email, margin, y);

	// Invoice title - right aligned
	doc.setTextColor(0, 0, 0);
	doc.setFontSize(16);
	doc.setFont("helvetica", "bold");
	const invoiceTitle = "FACTURE";
	const titleWidth = doc.getTextWidth(invoiceTitle);
	doc.text(invoiceTitle, pageWidth - margin - titleWidth, margin);

	// Invoice details - right aligned
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	const invoiceNumber = order.invoiceNumber ?? order.orderNumber;
	const invoiceRef = `N° : ${invoiceNumber}`;
	const invoiceDate = `Date : ${formatDatePdf(order.invoiceGeneratedAt ?? order.paidAt ?? order.createdAt)}`;
	const orderRef = `Commande : ${order.orderNumber}`;
	doc.text(invoiceRef, pageWidth - margin - doc.getTextWidth(invoiceRef), margin + 8);
	doc.text(invoiceDate, pageWidth - margin - doc.getTextWidth(invoiceDate), margin + 12);
	doc.text(orderRef, pageWidth - margin - doc.getTextWidth(orderRef), margin + 16);

	y += 10;

	// Separator
	doc.setDrawColor(220, 220, 220);
	doc.setLineWidth(0.5);
	doc.line(margin, y, pageWidth - margin, y);
	y += 10;

	// Customer info
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.text("Facturé à :", margin, y);
	y += 5;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(9);
	doc.text(`${order.shippingFirstName} ${order.shippingLastName}`, margin, y);
	y += 4;
	doc.text(order.shippingAddress1, margin, y);
	y += 4;
	if (order.shippingAddress2) {
		doc.text(order.shippingAddress2, margin, y);
		y += 4;
	}
	doc.text(`${order.shippingPostalCode} ${order.shippingCity}`, margin, y);
	y += 4;
	if (order.customerEmail) {
		doc.text(order.customerEmail, margin, y);
		y += 4;
	}
	y += 8;

	// Items table header
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

	// Items
	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	for (const item of order.items) {
		const description = item.productTitle;
		const variant = [item.skuColor, item.skuMaterial, item.skuSize]
			.filter(Boolean)
			.join(" / ");

		doc.text(description, colX.description + 2, y);
		if (variant) {
			doc.setTextColor(100, 100, 100);
			doc.text(variant, colX.description + 2, y + 3.5);
			doc.setTextColor(0, 0, 0);
		}
		doc.text(String(item.quantity), colX.qty, y);
		doc.text(formatEuroPdf(item.price), colX.unitPrice, y);
		doc.text(formatEuroPdf(item.price * item.quantity), colX.total, y);
		y += variant ? 9 : 6;
	}

	y += 4;
	doc.setDrawColor(220, 220, 220);
	doc.line(margin, y, pageWidth - margin, y);
	y += 8;

	// Totals
	const totalsX = margin + contentWidth * 0.6;
	doc.setFontSize(9);

	doc.text("Sous-total HT", totalsX, y);
	doc.text(formatEuroPdf(order.subtotal), colX.total, y);
	y += 5;

	if (order.discountAmount > 0) {
		doc.text("Réduction", totalsX, y);
		doc.text(`-${formatEuroPdf(order.discountAmount)}`, colX.total, y);
		y += 5;
	}

	doc.text("Frais de livraison", totalsX, y);
	doc.text(
		order.shippingCost === 0 ? "Offerts" : formatEuroPdf(order.shippingCost),
		colX.total,
		y,
	);
	y += 5;

	doc.text("TVA", totalsX, y);
	doc.text("0,00 €", colX.total, y);
	y += 3;

	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.3);
	doc.line(totalsX, y, pageWidth - margin, y);
	y += 5;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.text("Total TTC", totalsX, y);
	doc.text(formatEuroPdf(order.total), colX.total, y);
	y += 12;

	// Legal mentions
	doc.setFont("helvetica", "italic");
	doc.setFontSize(7);
	doc.setTextColor(120, 120, 120);
	doc.text("TVA non applicable, art. 293 B du CGI", margin, y);
	y += 3.5;
	doc.text(`Entrepreneur individuel (micro-entreprise) — ${COMPANY.legalName}`, margin, y);
	y += 3.5;
	doc.text(`Paiement reçu le ${formatDatePdf(order.paidAt ?? order.createdAt)}`, margin, y);

	return doc.output("arraybuffer");
}
