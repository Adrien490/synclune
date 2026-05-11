import * as Sentry from "@sentry/nextjs";

/**
 * Business context attached to wishlist exceptions so post-incident debugging
 * keeps the productId / wishlistItemId / userId that triggered the failure.
 */
export interface WishlistErrorContext {
	service: string;
	productId?: string;
	wishlistItemId?: string;
	userId?: string;
	email?: string;
	stage?: string;
	[key: string]: string | undefined;
}

/**
 * Captures a wishlist service exception in Sentry with structured business context.
 *
 * Mirrors `captureWebhookError` semantics: tag-based filtering
 * (`module`, `service`, `stage`), grouped fingerprint per service, and a
 * `business` context block carrying the resource identifiers needed to triage.
 */
export function captureWishlistError(error: unknown, context: WishlistErrorContext): void {
	const { service, stage, ...business } = context;

	Sentry.withScope((scope) => {
		scope.setTag("module", "wishlist");
		scope.setTag("service", service);
		if (stage) scope.setTag("stage", stage);
		scope.setLevel("error");
		scope.setFingerprint(["wishlist", service, stage ?? "unknown"]);

		const businessEntries = Object.entries(business).filter(([, v]) => v !== undefined);
		if (businessEntries.length > 0) {
			scope.setContext("business", Object.fromEntries(businessEntries));
		}

		Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
	});
}
