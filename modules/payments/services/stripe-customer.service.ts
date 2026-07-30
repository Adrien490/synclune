import Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

interface CreateStripeCustomerParams {
	email: string;
	firstName: string;
	lastName: string;
	address: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country?: string | null;
	};
	phoneNumber?: string | null;
	userId: string | null;
}

type CreateStripeCustomerResult = { customerId: string } | { customerId: null; error?: string };

/**
 * Creates or retrieves a Stripe customer for checkout.
 *
 * Uses an idempotency key based on email to prevent duplicate customers.
 * Updates the user record with the Stripe customer ID if the user is authenticated.
 */
export async function getOrCreateStripeCustomer(
	existingCustomerId: string | null,
	params: CreateStripeCustomerParams,
): Promise<CreateStripeCustomerResult> {
	if (existingCustomerId) {
		return { customerId: existingCustomerId };
	}

	return Sentry.startSpan(
		{ name: "stripe.customers.create", op: "stripe.customer" },
		async (span) => {
			span.setAttribute("stripe.has_user", !!params.userId);

			try {
				// Lowercase + trim so case variations of the same email reuse the same Stripe customer.
				const customerIdempotencyKey = `customer-create-${params.email.toLowerCase().trim()}`;

				// `initializePayment` appelle ce service AVANT toute saisie d'adresse : il
				// passe des chaînes vides. On omet alors `name` et `address` au lieu
				// d'envoyer un objet de chaînes vides — sinon tout client qui abandonne le
				// tunnel laisse chez Stripe une fiche à l'adresse `{ country: "FR" }` seule,
				// que rien ne distingue d'une adresse réellement renseignée. L'identité de
				// facturation arrive à `confirmCheckout` via `enrichStripeCustomer`.
				const fullName = `${params.firstName} ${params.lastName}`.trim();
				const hasAddress = Boolean(
					params.address.addressLine1 || params.address.postalCode || params.address.city,
				);

				const customer = await stripe.customers.create(
					{
						email: params.email,
						...(fullName && { name: fullName }),
						...(hasAddress && {
							address: {
								line1: params.address.addressLine1,
								line2: params.address.addressLine2 ?? undefined,
								postal_code: params.address.postalCode,
								city: params.address.city,
								country: params.address.country ?? "FR",
							},
						}),
						...(params.phoneNumber && { phone: params.phoneNumber }),
						metadata: {
							source: "checkout_b2c",
							createdFrom: "synclune-bijoux",
						},
					},
					{ idempotencyKey: customerIdempotencyKey },
				);

				// Persist the customer id on the User in its own try/catch: the Stripe
				// customer already exists at this point, so a DB write failure must NOT
				// discard `customer.id` (that would create an orphan cus_xxx and drop the
				// customer link on the PaymentIntent for this whole checkout). We still
				// return the id; the next checkout — or the confirm-step backfill — heals
				// the persistence.
				if (params.userId) {
					try {
						await prisma.user.update({
							where: { id: params.userId },
							data: { stripeCustomerId: customer.id },
						});
					} catch (persistError) {
						logger.warn("[STRIPE_CUSTOMER] Stripe customer created but failed to persist on User", {
							userId: params.userId,
							customerId: customer.id,
							error: persistError instanceof Error ? persistError.message : String(persistError),
						});
						Sentry.captureException(persistError, {
							tags: { scope: "stripe-customer-persist" },
							extra: { userId: params.userId, customerId: customer.id },
						});
					}
				}

				return { customerId: customer.id };
			} catch (e) {
				if (e instanceof Stripe.errors.StripeInvalidRequestError) {
					return { customerId: null, error: "Impossible de créer le profil client de paiement." };
				}
				// Transient error: continue without a Stripe customer
				logger.warn(
					"[STRIPE_CUSTOMER] Transient error creating Stripe customer, continuing without",
					{
						email: params.email,
						error: e instanceof Error ? e.message : String(e),
					},
				);
				return { customerId: null };
			}
		},
	);
}

interface EnrichStripeCustomerParams {
	name: string;
	address: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country?: string | null;
	};
	phoneNumber?: string | null;
}

/**
 * Enriches an existing Stripe customer with the real billing identity
 * (name / address / phone) collected at checkout confirmation.
 *
 * The customer is created email-only at `initializePayment` (we don't yet have
 * the shipping address there), then enriched here via `customers.update` —
 * NOT a second `customers.create`, which would clash with the email-based
 * idempotency key from init and fail for guests.
 *
 * Best-effort by design: the Stripe customer object is cosmetic (the legal
 * invoice identity lives on the immutable Order snapshot, Art. 289 CGI), so an
 * enrichment failure must never break checkout. Errors are logged, swallowed.
 */
export async function enrichStripeCustomer(
	customerId: string,
	params: EnrichStripeCustomerParams,
): Promise<void> {
	try {
		await stripe.customers.update(customerId, {
			...(params.name && { name: params.name }),
			address: {
				line1: params.address.addressLine1,
				line2: params.address.addressLine2 ?? undefined,
				postal_code: params.address.postalCode,
				city: params.address.city,
				country: params.address.country ?? "FR",
			},
			...(params.phoneNumber && { phone: params.phoneNumber }),
		});
	} catch (e) {
		logger.warn("[STRIPE_CUSTOMER] Failed to enrich Stripe customer", {
			customerId,
			error: e instanceof Error ? e.message : String(e),
		});
	}
}
