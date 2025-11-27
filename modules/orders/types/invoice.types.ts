// ============================================================================
// TYPES - INVOICE
// ============================================================================

export type GetOrderInvoiceUrlsReturn = {
	success: boolean;
	invoicePdfUrl?: string;
	invoiceUrl?: string;
	invoiceNumber?: string;
	error?: string;
};

export type DownloadInvoicePdfReturn = {
	success: boolean;
	pdfData?: Uint8Array;
	filename?: string;
	error?: string;
};
