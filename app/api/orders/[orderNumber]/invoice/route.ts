import { getOrder } from "@/modules/orders/data/get-order";
import { generateInvoicePdf } from "@/modules/orders/services/generate-invoice-pdf";
import { generateInvoiceNumber } from "@/modules/orders/services/invoice-number.service";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";
import { checkRateLimit, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> }
) {
	const { orderNumber } = await params;

	const session = await getSession();
	if (!session?.user?.id) {
		return new Response("Non autorisé", { status: 401 });
	}

	// Rate limit: PDF generation is CPU-intensive
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

	const order = await getOrder({ orderNumber });
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// Defense-in-depth: getOrder already scopes by userId for non-admins,
	// but we add an explicit ownership check for the API route
	if (order.userId !== session.user.id) {
		return new Response("Accès interdit", { status: 403 });
	}

	if (order.paymentStatus !== "PAID") {
		return new Response("Facture non disponible pour cette commande", {
			status: 400,
		});
	}

	// Generate and persist invoice number on first download (Article 286 CGI)
	let invoiceOrder = order;
	if (!order.invoiceNumber) {
		try {
			const invoiceNumber = await generateInvoiceNumber();
			const now = new Date();

			const updated = await prisma.order.update({
				where: { id: order.id },
				data: {
					invoiceNumber,
					invoiceStatus: "GENERATED",
					invoiceGeneratedAt: now,
				},
				select: { invoiceNumber: true, invoiceGeneratedAt: true },
			});

			// Merge the new invoice fields into the order for PDF generation
			invoiceOrder = {
				...order,
				invoiceNumber: updated.invoiceNumber,
				invoiceStatus: "GENERATED" as const,
				invoiceGeneratedAt: updated.invoiceGeneratedAt,
			};

			// Invalidate cache so the invoice number shows in admin
			getOrderInvalidationTags(order.userId ?? undefined, order.id).forEach(tag => updateTag(tag));
		} catch (e) {
			// If invoice number generation fails (e.g. unique constraint race),
			// still serve the PDF with orderNumber as reference
			console.error("[INVOICE] Failed to persist invoice number:", e);
		}
	}

	const pdfBuffer = generateInvoicePdf(invoiceOrder);

	const filename = invoiceOrder.invoiceNumber
		? `facture-${invoiceOrder.invoiceNumber}.pdf`
		: `facture-${orderNumber}.pdf`;

	return new Response(pdfBuffer, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Cache-Control": "private, max-age=3600",
		},
	});
}
