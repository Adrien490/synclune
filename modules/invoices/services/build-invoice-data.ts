import { getVendorLegalInfo } from "@/shared/lib/stripe";
import { normalizeFiscalIdentifier } from "@/shared/schemas/b2b-identifiers.schema";
import {
	DEFAULT_TAX_CATEGORY,
	type TaxCategoryCode,
	TAX_CATEGORY_CODES,
} from "@/shared/constants/tax-categories";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type {
	InvoiceData,
	InvoiceFormat,
	InvoiceLine,
	InvoiceTotals,
	SellerInfo,
	BuyerInfo,
	StructuredAddress,
	TaxBreakdownLine,
	PrecedingInvoiceRef,
} from "../types/invoice-data";

/**
 * Construit l'objet pivot `InvoiceData` à partir d'un `Order` Prisma.
 *
 * Règles invariantes :
 *  - **Snapshot pur** : aucun champ n'est rechargé live depuis la DB, tout
 *    vient du payload `Order` fourni par l'appelant (Art. L102 B LPF —
 *    facture reconstituable à l'identique).
 *  - **Totaux recalculés** depuis les lignes (pas relus depuis Order). Si
 *    l'addition diverge de `Order.total`, c'est un bug dans le checkout ;
 *    le renderer doit le détecter via le Zod refine de `invoiceDataSchema`.
 *  - **Pas de fallback magique** : un Order sans `invoiceNumber` lève. La
 *    génération du numéro est la responsabilité de `persistInvoiceNumber`
 *    en amont (webhook eager / lazy fallback dans la route /invoice).
 *
 * Pour les avoirs, appeler `buildCreditNoteData(order, refund)` (à venir
 * en Phase 2B+ une fois `voidInvoice` migré vers Refund).
 */

interface BuildInvoiceDataOptions {
	/** Format de rendu cible. Défaut "PDF". */
	format?: InvoiceFormat;
	/** Référence à la facture précédente quand l'objet construit est un avoir. */
	precedingInvoice?: PrecedingInvoiceRef | null;
}

export function buildInvoiceData(
	order: GetOrderReturn,
	options: BuildInvoiceDataOptions = {},
): InvoiceData {
	if (!order.invoiceNumber) {
		throw new Error(
			`buildInvoiceData : Order ${order.orderNumber} n'a pas de invoiceNumber. ` +
				`Appeler persistInvoiceNumber() d'abord.`,
		);
	}
	if (!order.invoiceGeneratedAt) {
		throw new Error(
			`buildInvoiceData : Order ${order.orderNumber} a un invoiceNumber mais pas de ` +
				`invoiceGeneratedAt. Etat incoherent — verifier la migration des donnees.`,
		);
	}

	const { format = "PDF", precedingInvoice = null } = options;

	const seller = buildSellerInfo();
	const buyer = buildBuyerInfo(order);
	const shippingAddress = buildShippingAddress(order);
	const billingAddress = buildBillingAddress(order, shippingAddress);
	const lines = order.items.map((item, index) => buildInvoiceLine(item, index + 1));
	const totals = buildTotals(order, lines);

	return {
		invoiceNumber: order.invoiceNumber,
		invoiceFormat: format,
		issuedAt: order.invoiceGeneratedAt,
		dueAt: null, // paiement immédiat Stripe — pas d'échéance
		currency: "EUR",
		seller,
		buyer,
		shippingAddress,
		billingAddress,
		lines,
		totals,
		payment: {
			method: order.paymentMethod,
			paidAt: order.paidAt,
			stripePaymentIntentId: order.stripePaymentIntentId,
			stripeChargeId: null, // pas dans GET_ORDER_SELECT, peut être ajouté plus tard
		},
		precedingInvoice,
		meta: {
			orderId: order.id,
			orderNumber: order.orderNumber,
			notes: null,
		},
	};
}

// ============================================================================
// Helpers
// ============================================================================

function buildSellerInfo(): SellerInfo {
	const vendor = getVendorLegalInfo();
	return {
		legalName: vendor.company_legal_name,
		tradeName: vendor.company_trade_name,
		// Normalise pour respecter le format canonique InvoiceData (chiffres seuls).
		siren: normalizeFiscalIdentifier(vendor.company_siren) ?? "",
		siret: normalizeFiscalIdentifier(vendor.company_siret) ?? "",
		vatNumber: normalizeFiscalIdentifier(vendor.company_vat),
		apeCode: vendor.company_ape,
		legalForm: "Entrepreneur individuel",
		address: parseVendorAddress(vendor.company_address),
		email: vendor.company_email,
		// Phase 5 — pas encore référencé annuaire DGFiP
		eInvoicingAddress: null,
		eInvoicingPlatformId: null,
		vatExemptionText: vendor.vat_exemption,
	};
}

/**
 * Parse une adresse vendeur "rue, postalCode city, country" en `StructuredAddress`.
 * Format actuel : "77 Boulevard du Tertre, 44100 Nantes, France".
 */
function parseVendorAddress(raw: string): StructuredAddress {
	const vendor = getVendorLegalInfo();
	const parts = raw.split(",").map((p) => p.trim());
	const line1 = parts[0] ?? raw;
	const cityPart = parts[1] ?? "";
	const postalMatch = cityPart.match(/^(\d{4,10})\s+(.+)$/);
	return {
		recipientName: vendor.company_legal_name,
		line1,
		line2: null,
		postalCode: postalMatch?.[1] ?? "",
		city: postalMatch?.[2] ?? cityPart,
		countryCode: "FR",
	};
}

function buildBuyerInfo(order: GetOrderReturn): BuyerInfo {
	const { firstName, lastName } = splitCustomerName(order.customerName);
	return {
		type: order.customerType,
		legalName: order.customerCompanyName,
		firstName,
		lastName,
		email: order.customerEmail,
		phone: order.customerPhone,
		siren: order.customerCompanySiren,
		siret: order.customerCompanySiret,
		vatNumber: order.customerCompanyVatNumber,
		eInvoicingAddress: null, // Phase 5
		eInvoicingPlatformId: null,
		publicEntityId: null,
		chorusServiceCode: null,
	};
}

/**
 * Split "Prénom Nom" → { firstName, lastName }. Fallback gracieux : si pas
 * d'espace, on met tout dans firstName et lastName="-" pour respecter la
 * contrainte min(1) du schema (recipientName ne doit pas être vide).
 */
function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
	const trimmed = fullName.trim();
	const spaceIndex = trimmed.indexOf(" ");
	if (spaceIndex === -1) {
		return { firstName: trimmed || "-", lastName: "-" };
	}
	return {
		firstName: trimmed.slice(0, spaceIndex),
		lastName: trimmed.slice(spaceIndex + 1) || "-",
	};
}

function buildShippingAddress(order: GetOrderReturn): StructuredAddress {
	return {
		recipientName: `${order.shippingFirstName} ${order.shippingLastName}`.trim(),
		line1: order.shippingAddress1,
		line2: order.shippingAddress2,
		postalCode: order.shippingPostalCode,
		city: order.shippingCity,
		countryCode: order.shippingCountry,
	};
}

function buildBillingAddress(
	order: GetOrderReturn,
	shippingAddress: StructuredAddress,
): StructuredAddress {
	if (order.billingSameAsShipping || !order.billingFirstName) {
		return shippingAddress;
	}
	return {
		recipientName: `${order.billingFirstName} ${order.billingLastName ?? ""}`.trim(),
		line1: order.billingAddress1 ?? shippingAddress.line1,
		line2: order.billingAddress2,
		postalCode: order.billingPostalCode ?? shippingAddress.postalCode,
		city: order.billingCity ?? shippingAddress.city,
		countryCode: order.billingCountry ?? shippingAddress.countryCode,
	};
}

function buildInvoiceLine(item: GetOrderReturn["items"][number], lineNumber: number): InvoiceLine {
	const taxCategoryCode = (item.taxCategoryCode ?? DEFAULT_TAX_CATEGORY) as TaxCategoryCode;
	// Garde-fou : lineTotal* peuvent etre 0 sur les lignes historiques pre-Phase 2A.
	// Dans ce cas, on reconstruit depuis price * quantity (cas franchise).
	const lineTotalExclTax = item.lineTotalExcludingTax || item.price * item.quantity;
	const lineTotalInclTax = item.lineTotalIncludingTax || item.price * item.quantity;
	return {
		lineNumber,
		productTitle: item.productTitle,
		productDescription: item.productDescription,
		skuCode: item.skuSku,
		variantInfo: {
			color: item.skuColor,
			material: item.skuMaterial,
			size: item.skuSize,
		},
		quantity: item.quantity,
		unitPriceExclTax: item.price,
		discountAmount: 0, // pas de remise par ligne actuellement
		taxRate: item.taxRate,
		taxCategoryCode,
		taxAmount: item.taxAmount,
		lineTotalExclTax,
		lineTotalInclTax,
	};
}

function buildTotals(order: GetOrderReturn, lines: InvoiceLine[]): InvoiceTotals {
	const subtotalExclTax = lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
	const totalTaxFromLines = lines.reduce((sum, line) => sum + line.taxAmount, 0);
	const totalInclTax = order.total;
	const totalDiscount = order.discountAmount;
	const shippingExclTax = order.shippingCost;
	const shippingTax = 0; // franchise — pas de TVA sur livraison non plus
	const totalTax = totalTaxFromLines + shippingTax;
	const totalExclTax = totalInclTax - totalTax;

	const taxBreakdown: TaxBreakdownLine[] = buildTaxBreakdown(lines, shippingExclTax, shippingTax);

	return {
		subtotalExclTax,
		totalDiscount,
		shippingExclTax,
		shippingTax,
		taxBreakdown,
		totalExclTax,
		totalTax,
		totalInclTax,
		totalPaid: totalInclTax, // Stripe encaisse l'intégralité
		amountDue: 0,
	};
}

/**
 * Agrège les lignes par (taux, catégorie) pour produire le breakdown TVA
 * affiché en pied de facture et exigé par Factur-X (BT-117 + BT-119).
 */
function buildTaxBreakdown(
	lines: InvoiceLine[],
	shippingExclTax: number,
	shippingTax: number,
): TaxBreakdownLine[] {
	const map = new Map<string, TaxBreakdownLine>();

	for (const line of lines) {
		const key = `${line.taxRate}|${line.taxCategoryCode}`;
		const existing = map.get(key);
		if (existing) {
			existing.taxableAmount += line.lineTotalExclTax;
			existing.taxAmount += line.taxAmount;
		} else {
			map.set(key, {
				rate: line.taxRate,
				taxableAmount: line.lineTotalExclTax,
				taxAmount: line.taxAmount,
				categoryCode: line.taxCategoryCode,
				exemptionReason:
					line.taxCategoryCode === TAX_CATEGORY_CODES.EXEMPT_FRANCHISE
						? "Franchise art. 293 B CGI"
						: null,
			});
		}
	}

	// Inclure le shipping dans la même catégorie que les lignes (ou ZB par défaut).
	if (shippingExclTax > 0) {
		const shippingCategory = lines[0]?.taxCategoryCode ?? (DEFAULT_TAX_CATEGORY as TaxCategoryCode);
		const key = `${0}|${shippingCategory}`;
		const existing = map.get(key);
		if (existing) {
			existing.taxableAmount += shippingExclTax;
			existing.taxAmount += shippingTax;
		} else {
			map.set(key, {
				rate: 0,
				taxableAmount: shippingExclTax,
				taxAmount: shippingTax,
				categoryCode: shippingCategory,
				exemptionReason:
					shippingCategory === TAX_CATEGORY_CODES.EXEMPT_FRANCHISE
						? "Franchise art. 293 B CGI"
						: null,
			});
		}
	}

	return Array.from(map.values());
}
