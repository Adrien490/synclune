import { z } from "zod";
import { CustomerType, PaymentMethod } from "@/app/generated/prisma/enums";
import { TAX_CATEGORY_CODES } from "@/shared/constants/tax-categories";

/**
 * Validation runtime de l'objet pivot `InvoiceData` avant de le passer aux
 * renderers (PDF / Factur-X / UBL / CII).
 *
 * À appeler systématiquement après `buildInvoiceData()` pour garantir que
 * les totaux sont cohérents (somme des lignes = totaux globaux) avant
 * archivage immuable (Art. L102 B LPF).
 */

const invoiceFormatSchema = z.enum(["PDF", "FACTURX", "UBL", "CII"]);

const taxCategoryCodeSchema = z.enum([
	TAX_CATEGORY_CODES.STANDARD,
	TAX_CATEGORY_CODES.ZERO,
	TAX_CATEGORY_CODES.EXEMPT_FRANCHISE,
	TAX_CATEGORY_CODES.REVERSE_CHARGE,
	TAX_CATEGORY_CODES.EXEMPT,
	TAX_CATEGORY_CODES.EXPORT,
	TAX_CATEGORY_CODES.INTRA_COMMUNITY,
]);

const structuredAddressSchema = z.object({
	recipientName: z.string().min(1).max(255),
	line1: z.string().min(1).max(255),
	line2: z.string().max(255).nullable(),
	postalCode: z.string().min(1).max(20),
	city: z.string().min(1).max(100),
	countryCode: z.string().regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2"),
});

const sellerSchema = z.object({
	legalName: z.string().min(1).max(255),
	tradeName: z.string().min(1).max(255),
	siren: z.string().regex(/^[0-9]{9}$/),
	siret: z.string().regex(/^[0-9]{14}$/),
	vatNumber: z
		.string()
		.regex(/^[A-Z]{2}[A-Z0-9]{2,13}$/)
		.nullable(),
	apeCode: z.string().regex(/^[0-9]{2}\.[0-9]{2}[A-Z]$/),
	legalForm: z.string().min(1).max(100),
	address: structuredAddressSchema,
	email: z.email(),
	eInvoicingAddress: z.string().max(255).nullable(),
	eInvoicingPlatformId: z.string().max(100).nullable(),
	vatExemptionText: z.string().max(255).nullable(),
	bankIban: z
		.string()
		.regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/, "IBAN format invalide")
		.nullable(),
	bankBic: z
		.string()
		.regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "BIC/SWIFT format invalide")
		.nullable(),
});

const buyerSchema = z.object({
	type: z.enum(CustomerType),
	legalName: z.string().max(255).nullable(),
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	email: z.email(),
	phone: z.string().max(20).nullable(),
	siren: z
		.string()
		.regex(/^[0-9]{9}$/)
		.nullable(),
	siret: z
		.string()
		.regex(/^[0-9]{14}$/)
		.nullable(),
	vatNumber: z
		.string()
		.regex(/^[A-Z]{2}[A-Z0-9]{2,13}$/)
		.nullable(),
	eInvoicingAddress: z.string().max(255).nullable(),
	eInvoicingPlatformId: z.string().max(100).nullable(),
	publicEntityId: z.string().max(50).nullable(),
	chorusServiceCode: z.string().max(100).nullable(),
});

const invoiceLineSchema = z.object({
	lineNumber: z.number().int().positive(),
	productTitle: z.string().min(1).max(200),
	productDescription: z.string().nullable(),
	skuCode: z.string().max(100).nullable(),
	variantInfo: z.object({
		color: z.string().max(100).nullable(),
		material: z.string().max(100).nullable(),
		size: z.string().max(50).nullable(),
	}),
	quantity: z.number().int().positive(),
	unitPriceExclTax: z.number().int().nonnegative(),
	discountAmount: z.number().int().nonnegative(),
	taxRate: z.number().int().nonnegative(),
	taxCategoryCode: taxCategoryCodeSchema,
	taxAmount: z.number().int().nonnegative(),
	lineTotalExclTax: z.number().int().nonnegative(),
	lineTotalInclTax: z.number().int().nonnegative(),
	hsCode: z
		.string()
		.regex(/^[0-9]{6,10}$/, "Code SH : 6 à 10 chiffres")
		.nullable(),
	unitCode: z
		.string()
		.regex(/^[A-Z0-9]{1,3}$/, "UN/ECE Rec 20 : 1-3 caractères alphanumériques")
		.nullable(),
});

const taxBreakdownLineSchema = z.object({
	rate: z.number().int().nonnegative(),
	taxableAmount: z.number().int().nonnegative(),
	taxAmount: z.number().int().nonnegative(),
	categoryCode: taxCategoryCodeSchema,
	exemptionReason: z.string().nullable(),
});

const invoiceTotalsSchema = z.object({
	subtotalExclTax: z.number().int().nonnegative(),
	totalDiscount: z.number().int().nonnegative(),
	shippingExclTax: z.number().int().nonnegative(),
	shippingTax: z.number().int().nonnegative(),
	taxBreakdown: z.array(taxBreakdownLineSchema),
	totalExclTax: z.number().int().nonnegative(),
	totalTax: z.number().int().nonnegative(),
	totalInclTax: z.number().int().nonnegative(),
	totalPaid: z.number().int().nonnegative(),
	amountDue: z.number().int(),
});

const paymentInfoSchema = z.object({
	method: z.enum(PaymentMethod),
	paidAt: z.date().nullable(),
	stripePaymentIntentId: z.string().nullable(),
	stripeChargeId: z.string().nullable(),
});

const precedingInvoiceSchema = z
	.object({
		invoiceNumber: z.string().regex(/^F-[0-9]{4}-[0-9]{5}$/),
		issuedAt: z.date(),
		reason: z.string().max(500),
	})
	.nullable();

const voidedInfoSchema = z
	.object({
		creditNoteNumber: z.string().regex(/^A-[0-9]{4}-[0-9]{5}$/, "Format A-YYYY-NNNNN attendu"),
		voidedAt: z.date(),
	})
	.nullable();

const invoiceMetaSchema = z.object({
	orderId: z.cuid2(),
	orderNumber: z.string().min(1).max(50),
	notes: z.string().nullable(),
});

/**
 * Schema complet `InvoiceData`. Le refine final vérifie la cohérence
 * comptable (somme des lignes == totaux), ce qu'aucun renderer ne peut
 * vérifier ensuite.
 */
export const invoiceDataSchema = z
	.object({
		invoiceNumber: z.union([
			z.string().regex(/^F-[0-9]{4}-[0-9]{5}$/, "Format F-YYYY-NNNNN attendu"),
			z.string().regex(/^A-[0-9]{4}-[0-9]{5}$/, "Format A-YYYY-NNNNN attendu (avoir)"),
		]),
		invoiceFormat: invoiceFormatSchema,
		issuedAt: z.date(),
		dueAt: z.date().nullable(),
		currency: z.literal("EUR"),
		seller: sellerSchema,
		buyer: buyerSchema,
		shippingAddress: structuredAddressSchema,
		billingAddress: structuredAddressSchema,
		lines: z.array(invoiceLineSchema).min(1, "Au moins une ligne requise"),
		totals: invoiceTotalsSchema,
		payment: paymentInfoSchema,
		precedingInvoice: precedingInvoiceSchema,
		voidedInfo: voidedInfoSchema,
		meta: invoiceMetaSchema,
	})
	.refine(
		(data) => {
			const sumLineExclTax = data.lines.reduce((sum, line) => sum + line.lineTotalExclTax, 0);
			const sumLineInclTax = data.lines.reduce((sum, line) => sum + line.lineTotalInclTax, 0);
			const sumLineTax = data.lines.reduce((sum, line) => sum + line.taxAmount, 0);
			return (
				sumLineExclTax === data.totals.subtotalExclTax &&
				sumLineInclTax + data.totals.shippingExclTax + data.totals.shippingTax ===
					data.totals.totalInclTax + data.totals.totalDiscount &&
				sumLineTax + data.totals.shippingTax === data.totals.totalTax
			);
		},
		{
			message:
				"Incohérence comptable : somme des lignes != totaux. Re-calculer dans buildInvoiceData.",
		},
	);
