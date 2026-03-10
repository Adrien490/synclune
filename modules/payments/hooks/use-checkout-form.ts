"use client";

import { useAppForm } from "@/shared/components/forms";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import { getCheckoutFormOptions } from "../utils/checkout-form.utils";

interface UseCheckoutFormOptions {
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Hook for the single-page checkout form.
 * Uses TanStack Form for client-side validation only.
 * Payment submission is handled by PayButton via confirmCheckout + stripe.confirmPayment.
 */
export const useCheckoutForm = (options: UseCheckoutFormOptions) => {
	const { session, addresses } = options;

	const form = useAppForm({
		...getCheckoutFormOptions(session, addresses),
	});

	return { form };
};

export type CheckoutFormInstance = ReturnType<typeof useCheckoutForm>["form"];
