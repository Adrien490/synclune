/**
 * Extracts the customer's first name for email personalization.
 *
 * Priority: customerName (split on first space) > shippingFirstName > fallback
 */
export function extractCustomerFirstName(
	customerName: string | null | undefined,
	shippingFirstName: string | null | undefined,
	fallback = "Client"
): string {
	return customerName?.split(" ")[0] || shippingFirstName || fallback;
}
