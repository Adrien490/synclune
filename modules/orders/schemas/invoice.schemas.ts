import { z } from "zod";

// ============================================================================
// GET INVOICE URLS SCHEMA
// ============================================================================

export const getInvoiceUrlsSchema = z.object({
	orderId: z.string().trim().min(1),
});

// ============================================================================
// DOWNLOAD INVOICE PDF SCHEMA
// ============================================================================

export const downloadInvoicePdfSchema = z.object({
	orderId: z.string().trim().min(1),
});
