import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { orderNumberParamSchema } from "@/modules/orders/schemas/order-route-params.schema";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

/**
 * Polling endpoint utilisé par la page `/paiement/confirmation` (CHECKOUT-AUDIT-004)
 * pour détecter la bascule `paymentStatus PENDING → PAID/FAILED` post-webhook
 * sans afficher prématurément un état "Commande confirmée" qui serait ensuite
 * contredit par un email de remboursement (cas double-vente du dernier
 * exemplaire, paiement async refusé, etc.).
 *
 * Sécurité :
 * - Lookup par `orderNumber` + `orderId` (double clé non-bruteforcable).
 * - Si `order.userId !== null`, la session doit matcher (parité avec
 *   `getOrderForConfirmation`).
 * - Pas de PII renvoyée : uniquement `paymentStatus` + `status`.
 * - Rate limit ORDER_STATUS_POLL (60/min/identifier) — un client buggé qui
 *   spamme est arrêté sans gêner le polling 3s légitime.
 */

const querySchema = z.object({
	orderId: z.cuid2(),
});

interface StatusResponse {
	paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
	status:
		"PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "REFUNDED";
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> },
) {
	const { orderNumber } = await params;
	const url = new URL(request.url);

	const queryValidation = querySchema.safeParse({
		orderId: url.searchParams.get("orderId"),
	});
	if (!queryValidation.success) {
		return NextResponse.json({ error: "Bad request" }, { status: 400 });
	}
	const { orderId } = queryValidation.data;

	if (!orderNumberParamSchema.safeParse(orderNumber).success) {
		return NextResponse.json({ error: "Bad request" }, { status: 400 });
	}

	const session = await getSession();
	const headersList = await headers();
	const ipAddress = await getClientIp(headersList);
	const rateLimitId = getRateLimitIdentifier(session?.user.id ?? null, null, ipAddress);

	const rateLimit = await checkRateLimit(rateLimitId, ORDER_LIMITS.STATUS_POLL, ipAddress);
	if (!rateLimit.success) {
		return NextResponse.json(
			{ error: rateLimit.error ?? "Trop de requêtes." },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	}

	try {
		const order = await prisma.order.findFirst({
			where: { id: orderId, orderNumber, ...notDeleted },
			select: { paymentStatus: true, status: true, userId: true },
		});

		if (!order) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		// Ownership check parity with getOrderForConfirmation
		if (order.userId && order.userId !== session?.user.id) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const body: StatusResponse = {
			paymentStatus: order.paymentStatus,
			status: order.status,
		};

		return NextResponse.json(body, {
			status: 200,
			headers: {
				// Polled every 3s — must not be cached anywhere
				"Cache-Control": "no-store, max-age=0",
			},
		});
	} catch (error) {
		logger.error("Failed to fetch order status", error, {
			service: "order-status-route",
			orderNumber,
		});
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
