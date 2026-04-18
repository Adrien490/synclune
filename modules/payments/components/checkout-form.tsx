"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type {
	AppliedDiscount,
	ValidateDiscountCodeReturn,
} from "@/modules/discounts/types/discount.types";
import { CircleAlert, WifiOff } from "lucide-react";
import type { ShippingCountry } from "@/shared/constants/countries";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { usePaymentIntent } from "../hooks/use-payment-intent";

import { CheckoutSummary } from "./checkout-summary";
import { CheckoutSection } from "./checkout-section";
import { ShippingMethodSection } from "./shipping-method-section";
import { CheckoutContactSection } from "./checkout-contact-section";
import { CheckoutAddressFields } from "./checkout-address-fields";
import { CheckoutDiscountSection } from "./checkout-discount-section";
import { PaymentSectionSkeleton } from "./payment-section-skeleton";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

/**
 * Stripe bundle (`@stripe/react-stripe-js` ~100KB gzip) is loaded on-demand
 * via `next/dynamic` to keep it off the critical path. `ssr: false` is required
 * because Elements mounts against `window.Stripe`.
 */
const CheckoutStripeSection = dynamic(
	() => import("./checkout-stripe-section").then((mod) => ({ default: mod.CheckoutStripeSection })),
	{
		ssr: false,
		loading: () => <PaymentSectionSkeleton />,
	},
);

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Single-page checkout form (Shopify-style).
 *
 * Sections: Contact, Livraison, Mode d'expédition, Code promo, Paiement.
 * Payment via Stripe PaymentElement + ExpressCheckoutElement (Apple Pay / Google Pay / Link).
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;
	const headingRef = useRef<HTMLHeadingElement>(null);

	const { form } = useCheckoutForm({ session, addresses });

	const cartItems = cart.items.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
		priceAtAdd: item.priceAtAdd,
	}));

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const isOnline = useOnlineStatus();

	// Initialize Payment Intent
	const pi = usePaymentIntent({
		cartItems,
		email: isGuest ? undefined : session.user.email || undefined,
	});

	/**
	 * Builds ConfirmCheckoutData from the current form state.
	 * Called by PayButton before submission.
	 * Returns null if validation fails (triggers form errors).
	 * Validates unapplied discount codes before submission.
	 */
	async function getFormData(): Promise<ConfirmCheckoutData | null> {
		const values = form.state.values;
		const s = values.shipping;

		// Trigger full form validation + increment submissionAttempts
		await form.handleSubmit();

		if (!form.state.canSubmit) {
			// Scroll to error summary after render
			requestAnimationFrame(() => {
				const errorAlert = document.querySelector('[role="alert"]');
				if (errorAlert) {
					errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			});
			return null;
		}

		let appliedDiscount = values._appliedDiscount as AppliedDiscount | null;
		const rawDiscountCode = (values.discountCode as string).trim().toUpperCase();

		// If there's an unapplied discount code, validate it before submission
		if (!appliedDiscount && rawDiscountCode) {
			const result = await validateDiscountCode(rawDiscountCode, subtotal);
			if (result.valid && result.discount) {
				appliedDiscount = result.discount;
				form.setFieldValue("_appliedDiscount", result.discount);
				form.setFieldValue("discountCode", "");
			} else {
				// Open the discount section and show the error
				form.setFieldValue("_discountOpen", true);
				form.setFieldMeta("discountCode", (prev) => ({
					...prev,
					errors: [result.error ?? "Code invalide"],
				}));
				return null;
			}
		}

		const discountCode = appliedDiscount?.code ?? undefined;

		return {
			cartItems,
			shippingAddress: {
				fullName: s.fullName,
				addressLine1: s.addressLine1,
				addressLine2: s.addressLine2 || undefined,
				city: s.city,
				postalCode: s.postalCode,
				country: ((s.country as string) || "FR") as ShippingCountry,
				phoneNumber: s.phoneNumber,
			},
			email: isGuest ? (values.email as string) || undefined : undefined,
			discountCode,
			paymentIntentId: pi.paymentIntentId!,
			saveInfo: values.saveInfo,
		};
	}

	return (
		<form.Subscribe
			selector={(s) => ({
				country: s.values.shipping.country,
				postalCode: s.values.shipping.postalCode,
				appliedDiscount: s.values._appliedDiscount,
			})}
		>
			{({ country: rawCountry, postalCode, appliedDiscount }) => {
				const country = ((rawCountry as string) || "FR") as ShippingCountry;
				const shippingRaw = calculateShipping(country, postalCode as string);
				const shippingUnavailable = shippingRaw === null;
				const shipping = shippingRaw ?? 0;
				const discountAmount = (appliedDiscount as AppliedDiscount | null)?.discountAmount ?? 0;
				const total = subtotal - discountAmount + shipping;
				const shippingInfo = getShippingInfo(country, postalCode as string);

				return (
					<div className="grid gap-6 pb-32 lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-0">
						<div className="space-y-8">
							<h1 ref={headingRef} tabIndex={-1} className="sr-only">
								Paiement sécurisé
							</h1>

							{!isOnline && (
								<Alert variant="destructive" role="alert" aria-live="assertive">
									<WifiOff className="size-4" />
									<AlertTitle>Connexion internet perdue</AlertTitle>
									<AlertDescription>
										Vérifiez votre connexion internet avant de continuer. Le paiement nécessite une
										connexion active.
									</AlertDescription>
								</Alert>
							)}

							{pi.error && (
								<Alert variant="destructive" role="alert">
									<CircleAlert className="size-4" />
									<AlertDescription>{pi.error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-8">
								{/* === SECTION 1: Contact === */}
								<CheckoutContactSection form={form} session={session} />

								{/* === SECTION 2: Shipping Address === */}
								<CheckoutSection title="Livraison">
									<CheckoutAddressFields form={form} session={session} addresses={addresses} />
								</CheckoutSection>

								{/* === SECTION 3: Shipping Method === */}
								<CheckoutSection title="Mode d'expédition">
									<ShippingMethodSection
										shipping={shipping}
										shippingUnavailable={shippingUnavailable}
										shippingInfo={shippingInfo}
									/>
								</CheckoutSection>

								{/* === SECTION 4: Discount Code === */}
								<CheckoutDiscountSection form={form} cart={cart} />

								{/* === SECTION 5: Payment === */}
								<CheckoutSection title="Paiement">
									{pi.isLoading ? (
										<PaymentSectionSkeleton />
									) : pi.clientSecret ? (
										<form.Subscribe
											selector={(s) => ({
												canSubmit: s.canSubmit,
												email: s.values.email,
												billingName: s.values.shipping.fullName,
											})}
										>
											{({ canSubmit, email, billingName }) => (
												<CheckoutStripeSection
													clientSecret={pi.clientSecret!}
													total={total}
													canSubmit={canSubmit}
													shippingUnavailable={shippingUnavailable}
													email={
														isGuest
															? (email as string) || undefined
															: session.user.email || undefined
													}
													billingName={(billingName as string) || undefined}
													getFormData={getFormData}
												/>
											)}
										</form.Subscribe>
									) : null}
								</CheckoutSection>
							</div>
						</div>

						<div className="order-first lg:order-0">
							<CheckoutSummary
								cart={cart}
								subtotal={subtotal}
								shipping={shipping}
								shippingUnavailable={shippingUnavailable}
								shippingInfo={shippingInfo}
								total={total}
								discountAmount={discountAmount}
								appliedDiscount={
									appliedDiscount as NonNullable<ValidateDiscountCodeReturn["discount"]> | null
								}
							/>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
