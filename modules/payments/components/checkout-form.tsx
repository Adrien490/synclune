"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
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

function subscribeOnlineStatus(callback: () => void) {
	window.addEventListener("online", callback);
	window.addEventListener("offline", callback);
	return () => {
		window.removeEventListener("online", callback);
		window.removeEventListener("offline", callback);
	};
}

function getOnlineStatusSnapshot() {
	return navigator.onLine;
}

function getOnlineStatusServerSnapshot() {
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
 * Payment via Stripe PaymentElement + ExpressCheckoutElement (Apple Pay / Google Pay / Link).
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	const { form } = useCheckoutForm({ session, addresses });

	// Warn on tab close / back button when the form has been touched.
	// Disabled once the user reaches the Stripe redirect via `allowNavigation()`.
	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, true, {
		message: "Vos informations de commande seront perdues si vous quittez cette page.",
	});

	const cartItems = cart.items.map((item) => ({
		skuId: item.sku.id,
		quantity: item.quantity,
		priceAtAdd: item.priceAtAdd,
	}));

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	const isOnline = useSyncExternalStore(
		subscribeOnlineStatus,
		getOnlineStatusSnapshot,
		getOnlineStatusServerSnapshot,
	);

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
			// Focus + scroll to first invalid field (a11y WCAG 3.3.1) + error haptic
			requestAnimationFrame(() => {
				focusFirstInvalid();
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
					<CheckoutFormBody
						form={form}
						formRef={formRef}
						cart={cart}
						session={session}
						addresses={addresses}
						isGuest={isGuest}
						isOnline={isOnline}
						pi={pi}
						subtotal={subtotal}
						shipping={shipping}
						shippingInfo={shippingInfo}
						shippingUnavailable={shippingUnavailable}
						total={total}
						discountAmount={discountAmount}
						appliedDiscount={appliedDiscount as AppliedDiscount | null}
						country={country}
						postalCode={postalCode as string}
						getFormData={getFormData}
						allowNavigation={allowNavigation}
					/>
				);
			}}
		</form.Subscribe>
	);
}

interface CheckoutFormBodyProps {
	form: ReturnType<typeof useCheckoutForm>["form"];
	formRef: React.RefObject<HTMLFormElement | null>;
	cart: NonNullable<GetCartReturn>;
	session: Session | null;
	addresses: GetUserAddressesReturn | null;
	isGuest: boolean;
	isOnline: boolean;
	pi: ReturnType<typeof usePaymentIntent>;
	subtotal: number;
	shipping: number;
	shippingInfo: ReturnType<typeof getShippingInfo>;
	shippingUnavailable: boolean;
	total: number;
	discountAmount: number;
	appliedDiscount: AppliedDiscount | null;
	country: ShippingCountry;
	postalCode: string;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation: () => void;
}

function CheckoutFormBody({
	form,
	formRef,
	cart,
	session,
	addresses,
	isGuest,
	isOnline,
	pi,
	subtotal,
	shipping,
	shippingInfo,
	shippingUnavailable,
	total,
	discountAmount,
	appliedDiscount,
	country,
	postalCode,
	getFormData,
	allowNavigation,
}: CheckoutFormBodyProps) {
	// Keep Stripe PaymentIntent amount in sync with country/postalCode/discount changes
	// so wallet previews (Apple Pay / Google Pay / Link) display the correct total.
	// `updateAmount` is debounced 500ms internally.
	useEffect(() => {
		if (!pi.paymentIntentId || shippingUnavailable) return;
		pi.updateAmount(country, postalCode, discountAmount);
		// pi.updateAmount is stable; reading from refs internally.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pi.paymentIntentId, country, postalCode, discountAmount, shippingUnavailable]);

	return (
		<form
			ref={formRef}
			onSubmit={(e) => e.preventDefault()}
			noValidate
			aria-label="Formulaire de paiement"
			className="grid gap-6 pb-32 lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-0"
		>
			<div className="space-y-8">
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
						<AlertDescription className="flex flex-wrap items-center gap-3">
							<span>{pi.error}</span>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void pi.retry()}
								disabled={pi.isLoading}
								aria-busy={pi.isLoading}
							>
								Réessayer
							</Button>
						</AlertDescription>
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
										isOnline={isOnline}
										email={
											isGuest ? (email as string) || undefined : (session?.user.email ?? undefined)
										}
										billingName={(billingName as string) || undefined}
										getFormData={getFormData}
										allowNavigation={allowNavigation}
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
		</form>
	);
}
