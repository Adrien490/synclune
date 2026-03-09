"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { WifiOff } from "lucide-react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, useReducedMotion } from "motion/react";
import { type ShippingCountry } from "@/shared/constants/countries";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import type { CreateCheckoutSessionResult } from "../types/checkout.types";
import type { ValidateDiscountCodeReturn } from "@/modules/discounts/types/discount.types";
import { CheckoutSummary } from "./checkout-summary";
import { AddressStep } from "./address-step";
import { PaymentStep } from "./payment-step";
import type { SubmittedAddress } from "./address-summary";

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
 * Checkout orchestration component.
 *
 * Manages shared state (discount, payment step, submitted address) and
 * delegates rendering to AddressStep (step 1) and PaymentStep (step 2).
 */
export function CheckoutForm({ cart, session, addresses }: CheckoutFormProps) {
	const isGuest = !session;

	const [checkoutResult, setCheckoutResult] = useState<{
		clientSecret: string;
		orderId: string;
		orderNumber: string;
		address: SubmittedAddress;
	} | null>(null);
	const [appliedDiscount, setAppliedDiscount] = useState<NonNullable<
		ValidateDiscountCodeReturn["discount"]
	> | null>(null);

	const headingRef = useRef<HTMLHeadingElement>(null);

	const { form, action, isPending, state } = useCheckoutForm({
		session,
		addresses,
		onSuccess: handleSuccess,
	});

	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
	const discountAmount = appliedDiscount?.discountAmount ?? 0;

	const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
	const shouldReduceMotion = useReducedMotion();
	const fadeSlide = shouldReduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 10 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -10 },
				transition: { duration: MOTION_CONFIG.duration.normal },
			};

	function handleSuccess(data: CreateCheckoutSessionResult) {
		const s = form.state.values.shipping;
		setCheckoutResult({
			clientSecret: data.clientSecret,
			orderId: data.orderId,
			orderNumber: data.orderNumber,
			address: {
				fullName: s.fullName,
				addressLine1: s.addressLine1,
				addressLine2: s.addressLine2 || undefined,
				city: s.city,
				postalCode: s.postalCode,
				country: ((s.country as string) || "FR") as ShippingCountry,
				phoneNumber: s.phoneNumber,
				email: isGuest ? (form.state.values.email as unknown as string) || undefined : undefined,
			},
		});

		window.scrollTo({ top: 0, behavior: "smooth" });
		requestAnimationFrame(() => headingRef.current?.focus());
	}

	function handleEdit() {
		setCheckoutResult(null);
		requestAnimationFrame(() => {
			const firstInput = document.querySelector<HTMLInputElement>(
				'input[name="email"], input[name="shipping.fullName"]',
			);
			firstInput?.focus();
		});
	}

	const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0] ?? null;

	const currentStepLabel = checkoutResult
		? "Étape 2 sur 2 : Paiement"
		: "Étape 1 sur 2 : Adresse de livraison";

	return (
		<form.Subscribe
			selector={(s) => ({
				country: s.values.shipping.country,
				postalCode: s.values.shipping.postalCode,
			})}
		>
			{({ country: rawCountry, postalCode }) => {
				const country = ((rawCountry as string) || "FR") as ShippingCountry;
				const shippingRaw = calculateShipping(country, postalCode as string);
				const shippingUnavailable = shippingRaw === null;
				const shipping = shippingRaw ?? 0;
				const total = subtotal - discountAmount + shipping;
				const shippingInfo = getShippingInfo(country, postalCode as string);

				return (
					<div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
						<div className="space-y-6">
							<h1 ref={headingRef} tabIndex={-1} className="sr-only">
								Paiement sécurisé
							</h1>

							{/* Screen reader announcement for step changes */}
							<div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
								{currentStepLabel}
							</div>

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

							<ErrorBoundary
								errorMessage="Impossible de charger le formulaire"
								className="bg-muted/50 rounded-lg border p-8"
							>
								<AnimatePresence mode="wait">
									{checkoutResult ? (
										<PaymentStep
											key="payment"
											submittedAddress={checkoutResult.address}
											onEdit={handleEdit}
											clientSecret={checkoutResult.clientSecret}
											orderNumber={checkoutResult.orderNumber}
											fadeSlide={fadeSlide}
										/>
									) : (
										<AddressStep
											key="address"
											form={form}
											action={action}
											isPending={isPending}
											state={state}
											isGuest={isGuest}
											userEmail={session?.user.email ?? null}
											addresses={addresses}
											defaultAddressId={defaultAddress?.id ?? null}
											appliedDiscount={appliedDiscount}
											onDiscountApplied={setAppliedDiscount}
											shippingUnavailable={shippingUnavailable}
											total={total}
											country={country}
											cart={cart}
											fadeSlide={fadeSlide}
										/>
									)}
								</AnimatePresence>
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
								appliedDiscount={appliedDiscount}
							/>
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
