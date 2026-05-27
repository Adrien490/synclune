import { getOrder } from "@/modules/orders/data/get-order";
import { generateInvoicePdf } from "@/modules/orders/services/generate-invoice-pdf";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { archiveInvoicePdf } from "@/modules/orders/services/archive-invoice-pdf.service";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkRateLimit, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> },
) {
	const { orderNumber } = await params;

	const session = await getSession();
	if (!session?.user.id) {
		return new Response("Non autorisé", { status: 401 });
	}

	const isAdmin = session.user.role === "ADMIN";

	// Rate limit: PDF generation is CPU-intensive. Admins bypass it because
	// audit operations (fiscal control, customer support, batch verification)
	// can legitimately exceed the 10/h threshold meant for client downloads.
	if (!isAdmin) {
		const identifier = getRateLimitIdentifier(session.user.id);
		const rateCheck = await checkRateLimit(identifier, ORDER_LIMITS.INVOICE_DOWNLOAD);
		if (!rateCheck.success) {
			return new Response("Trop de requêtes. Veuillez réessayer plus tard.", {
				status: 429,
				headers: {
					"Retry-After": String(rateCheck.retryAfter ?? 60),
				},
			});
		}
	}

	const order = await getOrder({ orderNumber });
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// Defense-in-depth: getOrder already scopes by userId for non-admins, but
	// we add an explicit ownership check for the API route. Admins bypass for
	// fiscal audit / customer support — getOrder returned a record they had
	// the right to see in the first place.
	if (!isAdmin && order.userId !== session.user.id) {
		return new Response("Accès interdit", { status: 403 });
	}

	if (order.paymentStatus !== "PAID") {
		return new Response("Facture non disponible pour cette commande", {
			status: 400,
		});
	}

	// Generate and persist invoice number on first download (Article 286 CGI)
	// Fallback : normalement déjà persisté par ensureInvoiceNumberPersisted dans
	// le webhook checkout-completed (ORD-COMPLY-002), mais on garde le lazy path
	// pour les commandes historiques antérieures à ce déploiement.
	let invoiceOrder = order;
	if (!order.invoiceNumber) {
		const result = await persistInvoiceNumber(order.id, order.userId);
		if (result) {
			invoiceOrder = {
				...order,
				invoiceNumber: result.invoiceNumber,
				invoiceStatus: "GENERATED" as const,
				invoiceGeneratedAt: result.invoiceGeneratedAt,
			};
		}
	}

	// ORD-COMPLY-005 : servir le PDF archivé immuable si déjà uploadé.
	// invoicePdfUrl n'est pas dans GET_ORDER_SELECT_CUSTOMER (minimisation) — on
	// fait un select dédié ici. Si setté, on stream depuis UploadThing au lieu de
	// régénérer (garantit l'immuabilité bit-à-bit, Art. L102 B LPF).
	const archive = await prisma.order.findUnique({
		where: { id: order.id },
		select: { invoicePdfUrl: true },
	});
	if (archive?.invoicePdfUrl) {
		try {
			const archived = await fetch(archive.invoicePdfUrl, { cache: "no-store" });
			if (archived.ok) {
				const buffer = await archived.arrayBuffer();
				return new Response(buffer, {
					headers: buildPdfHeaders(invoiceOrder.invoiceNumber, orderNumber),
				});
			}
			logger.warn(
				`Archived invoice fetch failed (${archived.status}) — falling back to regeneration`,
				{ service: "invoice-route", orderId: order.id },
			);
		} catch (error) {
			logger.warn(`Archived invoice fetch threw — falling back to regeneration`, {
				service: "invoice-route",
				orderId: order.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const pdfBuffer = generateInvoicePdf(invoiceOrder);

	// Archive sur UploadThing si invoiceNumber présent (best-effort, ne bloque pas).
	if (invoiceOrder.invoiceNumber) {
		await archiveInvoicePdf(order.id, invoiceOrder.invoiceNumber, pdfBuffer);
	}

	return new Response(pdfBuffer, {
		headers: buildPdfHeaders(invoiceOrder.invoiceNumber, orderNumber),
	});
}

function buildPdfHeaders(invoiceNumber: string | null, orderNumber: string): HeadersInit {
	const filename = invoiceNumber ? `facture-${invoiceNumber}.pdf` : `facture-${orderNumber}.pdf`;
	return {
		"Content-Type": "application/pdf",
		"Content-Disposition": `attachment; filename="${filename}"`,
		// La facture d'une commande PAID est immuable bit-à-bit (Art. L102 B LPF —
		// archivée UploadThing + SHA-256). On peut cacher agressivement côté client
		// pour économiser CPU/bande passante : un téléchargement répété sert le
		// même fichier figé. `private` empêche tout cache intermédiaire partagé.
		"Cache-Control": "private, max-age=31536000, immutable",
		"X-Frame-Options": "DENY",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer",
	};
}
