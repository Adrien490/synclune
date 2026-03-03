import Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

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

	try {
		const customerIdempotencyKey = `customer-create-${params.email}`;

		const customer = await stripe.customers.create(
			{
				email: params.email,
				name: `${params.firstName} ${params.lastName}`.trim(),
				address: {
					line1: params.address.addressLine1,
					line2: params.address.addressLine2 ?? undefined,
					postal_code: params.address.postalCode,
					city: params.address.city,
					country: params.address.country ?? "FR",
				},
				phone: params.phoneNumber ?? undefined,
				metadata: {
					source: "checkout_b2c",
					createdFrom: "synclune-bijoux",
				},
			},
			{ idempotencyKey: customerIdempotencyKey },
		);

		if (params.userId) {
			await prisma.user.update({
				where: { id: params.userId },
				data: { stripeCustomerId: customer.id },
			});
		}

		return { customerId: customer.id };
	} catch (e) {
		if (e instanceof Stripe.errors.StripeInvalidRequestError) {
			return { customerId: null, error: "Email invalide pour la creation du profil client." };
		}
		// Transient error: continue without a Stripe customer
		logger.warn("[STRIPE_CUSTOMER] Transient error creating Stripe customer, continuing without", {
			email: params.email,
			error: e instanceof Error ? e.message : String(e),
		});
		return { customerId: null };
	}
}
