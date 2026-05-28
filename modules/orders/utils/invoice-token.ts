import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_NAMESPACE = "synclune-invoice-token-v1";
const TOKEN_LENGTH_HEX = 32; // 16 bytes truncated from HMAC-SHA256

function getSigningSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error(
			"BETTER_AUTH_SECRET must be defined (≥32 chars) to sign invoice access tokens.",
		);
	}
	return secret;
}

/**
 * Generates a stateless HMAC token granting access to an Order's invoice PDF
 * for the lifetime of the order (no expiration — invoices remain accessible
 * for the 10-year fiscal retention window). The token is derived from a stable
 * namespace + orderId + orderNumber, so it does not change on rotation of
 * unrelated fields.
 *
 * Used for guest checkouts where `Order.userId` is null and the customer has
 * no session to authenticate against. The token is delivered in the order
 * confirmation email and required as `?token=` query param on the invoice
 * route.
 */
export function generateInvoiceAccessToken(orderId: string, orderNumber: string): string {
	const payload = `${TOKEN_NAMESPACE}:${orderId}:${orderNumber}`;
	return createHmac("sha256", getSigningSecret())
		.update(payload)
		.digest("hex")
		.slice(0, TOKEN_LENGTH_HEX);
}

export function verifyInvoiceAccessToken(
	orderId: string,
	orderNumber: string,
	candidate: string | null | undefined,
): boolean {
	if (!candidate || candidate.length !== TOKEN_LENGTH_HEX) return false;
	const expected = generateInvoiceAccessToken(orderId, orderNumber);
	const expectedBuf = Buffer.from(expected, "hex");
	const candidateBuf = Buffer.from(candidate, "hex");
	if (expectedBuf.length !== candidateBuf.length) return false;
	return timingSafeEqual(expectedBuf, candidateBuf);
}
