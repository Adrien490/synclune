import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import type { GetOrderReturn } from "../types/order.types";

/**
 * @deprecated Phase 2B (2026-05-27). Préférer la chaîne explicite :
 * `renderInvoicePdf(buildInvoiceData(order))`. Ce shim reste en place pour
 * absorber les anciens appels sans casser la route ni les tests historiques.
 *
 * Les nouveaux call-sites doivent utiliser directement `modules/invoices/`
 * pour pouvoir cibler un autre format (Factur-X, UBL, CII) plus tard.
 */
export function generateInvoicePdf(order: GetOrderReturn): ArrayBuffer {
	return renderInvoicePdf(buildInvoiceData(order));
}
