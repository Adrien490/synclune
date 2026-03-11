"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type {
	AppliedDiscount,
	ValidateDiscountCodeReturn,
} from "@/modules/discounts/types/discount.types";
import { AlertCircle, Lock, WifiOff } from "lucide-react";
import type { ShippingCountry } from "@/shared/constants/countries";
import Link from "next/link";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { usePaymentIntent } from "../hooks/use-payment-intent";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutSection } from "./checkout-section";
import { ShippingMethodSection } from "./shipping-method-section";
import { PayButton } from "./pay-button";
import { StripeWordmark } from "./stripe-wordmark";
import { CheckoutContactSection } from "./checkout-contact-section";
import { CheckoutAddressFields } from "./checkout-address-fields";
import { CheckoutDiscountSection } from "./checkout-discount-section";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import { cn } from "@/shared/utils/cn";
import { getStripe } from "@/shared/lib/stripe-client";
import { stripeAppearance } from "../constants/stripe-appearance";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { PaymentElement } from "@stripe/react-stripe-js";

// Offline detection via useSyncExternalStore for SSR safety
function subscribeOnline(callback: () => void) {
	window.addEventListener("online", callback);
	window.addEventListener("offline", callback);
	return () => {
		window.removeEventListener("online", callback);
		window.removeEventListener("offline", callback);
	};
}
function getOnlineSnapshot() {
	return navigator.onLine;
}
function getServerSnapshot() {
	return true;
}

interface CheckoutFormProps {
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
}

/**
 * Single-page checkout form (Shopify-style).
 *
 * Sections: Contact, Livraison, Mode d'expédition, Code promo, Paiement.
 * Card-only payment via Stripe PaymentElement.
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;
	const headingRef = useRef<HTMLHeadingElement>(null);
	const [isPaymentReady, setIsPaymentReady] = useState(false);

	const { form } = useCheckoutForm({ session, addresses });

	const cartItems = cart.items.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
		priceAtAdd: item.priceAtAdd,
	}));

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);

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
			newsletterOptIn: values.newsletterOptIn,
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
					<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
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
									<AlertCircle className="size-4" />
									<AlertDescription>{pi.error}</AlertDescription>
								</Alert>
							)}

							<ErrorBoundary
								errorMessage="Impossible de charger le formulaire"
								className="bg-muted/50 rounded-lg border p-8"
							>
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
											<div
												className="animate-pulse space-y-4 rounded-xl border p-6"
												aria-busy="true"
												role="status"
											>
												<span className="sr-only">Chargement du formulaire de paiement…</span>
												<div className="bg-muted h-4 w-40 rounded" />
												<div className="bg-muted h-10 w-full rounded" />
												<div className="grid grid-cols-2 gap-4">
													<div className="bg-muted h-10 rounded" />
													<div className="bg-muted h-10 rounded" />
												</div>
											</div>
										) : pi.clientSecret ? (
											<Elements
												stripe={getStripe()}
												options={{
													clientSecret: pi.clientSecret,
													appearance: stripeAppearance,
													locale: "fr",
												}}
											>
												<div className="space-y-6">
													<p className="text-muted-foreground text-sm">
														Toutes les transactions sont sécurisées et chiffrées.
													</p>

													{!isPaymentReady && (
														<div className="animate-pulse space-y-4" aria-busy="true" role="status">
															<span className="sr-only">Chargement du formulaire de paiement…</span>
															<div className="bg-muted h-4 w-40 rounded" />
															<div className="bg-muted h-10 w-full rounded" />
															<div className="grid grid-cols-2 gap-4">
																<div className="bg-muted h-10 rounded" />
																<div className="bg-muted h-10 rounded" />
															</div>
														</div>
													)}
													<div
														className={cn(
															"bg-card border-primary/10 overflow-hidden rounded-2xl border p-4 shadow-sm",
															!isPaymentReady && "hidden",
														)}
													>
														<PaymentElement onReady={() => setIsPaymentReady(true)} />
													</div>

													{/* Terms notice + Pay button */}
													<div className="space-y-3">
														<p className="text-muted-foreground text-center text-xs">
															En passant commande, vous acceptez nos{" "}
															<Link
																href="/cgv"
																className="text-foreground underline hover:no-underline"
																target="_blank"
																rel="noopener noreferrer"
															>
																conditions générales de vente
															</Link>{" "}
															et notre{" "}
															<Link
																href="/confidentialite"
																className="text-foreground underline hover:no-underline"
																target="_blank"
																rel="noopener noreferrer"
															>
																politique de confidentialité
															</Link>
															.
														</p>
														<form.Subscribe
															selector={(s) => ({
																canSubmit: s.canSubmit,
																email: s.values.email,
																billingName: s.values.shipping.fullName,
															})}
														>
															{({ canSubmit, email, billingName }) => (
																<PayButton
																	total={total}
																	disabled={!canSubmit}
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
													</div>

													{/* Trust badges */}
													<div className="border-primary/5 bg-primary/2 rounded-xl border p-4">
														<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
															<span className="inline-flex items-center gap-1">
																<Lock className="h-3 w-3" />
																Paiement sécurisé
															</span>
															<span aria-hidden="true" className="text-border hidden sm:inline">
																|
															</span>
															<span className="inline-flex items-center gap-1">
																Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
															</span>
														</div>
													</div>
												</div>
											</Elements>
										) : null}
									</CheckoutSection>
								</div>
							</ErrorBoundary>
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
