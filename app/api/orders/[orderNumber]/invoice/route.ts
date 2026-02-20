import { getOrder } from "@/modules/orders/data/get-order";
import { generateInvoicePdf } from "@/modules/orders/services/generate-invoice-pdf";
import { getSession } from "@/modules/auth/lib/get-current-session";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> }
) {
	const { orderNumber } = await params;

	const session = await getSession();
	if (!session?.user?.id) {
		return new Response("Non autorisé", { status: 401 });
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

	const pdfBuffer = generateInvoicePdf(order);

	return new Response(pdfBuffer, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="facture-${orderNumber}.pdf"`,
			"Cache-Control": "private, max-age=3600",
		},
	});
}
