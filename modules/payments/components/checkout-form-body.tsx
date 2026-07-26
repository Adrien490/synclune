"use client";

import { useEffect, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { CircleAlert, Lock, WifiOff } from "lucide-react";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { ShippingCountry } from "@/shared/constants/countries";
import type { getShippingInfo } from "@/modules/orders/services/shipping.service";
import type {
	AppliedDiscount,
	ValidateDiscountCodeReturn,
} from "@/modules/discounts/types/discount.types";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import type { useCheckoutForm } from "../hooks/use-checkout-form";
import type { usePaymentIntent } from "../hooks/use-payment-intent";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutSection } from "./checkout-section";
import { ShippingMethodSection } from "./shipping-method-section";
import { CheckoutContactSection } from "./checkout-contact-section";
import { CheckoutAddressFields } from "./checkout-address-fields";
import { CheckoutDiscountSection } from "./checkout-discount-section";
import { PaymentSectionSkeleton } from "./payment-section-skeleton";
import { getIncompleteSections } from "../constants/checkout-fields";

// Lazy-load the ~100 KB `@stripe/react-stripe-js` bundle. Keeps `/paiement`
// initial JS below the 130 KB size-limit budget and lets the address/summary
// sections paint before Stripe Elements hydrate.
const CheckoutStripeSection = dynamic(
	() => import("./checkout-stripe-section").then((m) => m.CheckoutStripeSection),
	{ ssr: false, loading: () => <PaymentSectionSkeleton /> },
);

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
	/** Montant figé une fois la commande liée au PI (CHECKOUT-CONSENT-001). */
	lockedAmount: number | null;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	allowNavigation: () => void;
	onOrderBound: (finalAmount: number) => void;
}

export function CheckoutFormBody({
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
	lockedAmount,
	getFormData,
	allowNavigation,
	onOrderBound,
}: CheckoutFormBodyProps) {
	// Keep Stripe PaymentIntent amount in sync with country/postalCode/discount changes
	// so the card PaymentElement charges the correct total.
	// `updateAmount` is debounced 500ms internally.
	const appliedDiscountCode = appliedDiscount?.code ?? null;
	const isAmountLocked = lockedAmount !== null;
	const syncStripeAmount = useEffectEvent(() => {
		// Commande déjà liée au PI : le serveur refuse l'update (`metadata.orderId`),
		// inutile de solliciter l'action.
		if (!pi.paymentIntentId || shippingUnavailable || isAmountLocked) return;
		pi.updateAmount(country, postalCode, appliedDiscountCode);
	});

	useEffect(() => {
		syncStripeAmount();
	}, [
		pi.paymentIntentId,
		country,
		postalCode,
		appliedDiscountCode,
		shippingUnavailable,
		isAmountLocked,
	]);

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
					{isAmountLocked && (
						<Alert role="status">
							<Lock className="size-4" />
							<AlertTitle>Montant verrouillé</AlertTitle>
							<AlertDescription>
								Ta commande est enregistrée : le montant à payer ne peut plus changer. Actualise la
								page si tu veux modifier ta livraison ou ton code promo.
							</AlertDescription>
						</Alert>
					)}

					{/*
					 * CHECKOUT-CONSENT-001 — une fois la commande liée au PaymentIntent, le
					 * montant est figé côté serveur. On gèle donc nativement (fieldset
					 * disabled) tout ce qui ferait varier le total ou la destination, plutôt
					 * que d'afficher un récapitulatif qui ne correspondrait plus au débit.
					 * `min-w-0` neutralise le `min-width: min-content` par défaut du fieldset.
					 */}
					<fieldset disabled={isAmountLocked} className="min-w-0 space-y-8">
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
						<CheckoutDiscountSection form={form} />
					</fieldset>

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
									fieldMeta: s.fieldMeta,
								})}
							>
								{({ canSubmit, email, billingName, fieldMeta }) => {
									const invalidPaths = Object.entries(
										fieldMeta as Record<string, { errors: string[] }>,
									)
										.filter(([, meta]) => meta.errors.length > 0)
										.map(([name]) => name);
									const incompleteSections = getIncompleteSections(invalidPaths);
									return (
										<CheckoutStripeSection
											clientSecret={pi.clientSecret!}
											total={total}
											canSubmit={canSubmit}
											shippingUnavailable={shippingUnavailable}
											isOnline={isOnline}
											email={
												isGuest
													? (email as string) || undefined
													: (session?.user.email ?? undefined)
											}
											billingName={(billingName as string) || undefined}
											incompleteSections={incompleteSections}
											lockedAmount={lockedAmount}
											getFormData={getFormData}
											allowNavigation={allowNavigation}
											onOrderBound={onOrderBound}
										/>
									);
								}}
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
