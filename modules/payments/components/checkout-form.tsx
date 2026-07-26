"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import type { GetUserAddressesReturn } from "@/modules/addresses/data/get-user-addresses";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { AppliedDiscount } from "@/modules/discounts/types/discount.types";
import type { ShippingCountry } from "@/shared/constants/countries";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { usePaymentIntent } from "../hooks/use-payment-intent";

import { CheckoutFormBody } from "./checkout-form-body";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

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
 * Payment via Stripe PaymentElement — carte uniquement (pas de paiement express).
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

	// CHECKOUT-CONSENT-001 — montant figé dès qu'une commande est liée au
	// PaymentIntent (premier `confirmCheckout` réussi, typiquement suivi d'un
	// refus de carte). À partir de là le serveur refuse toute mise à jour du
	// montant ET toute resoumission divergente : l'UI doit cesser d'afficher un
	// total qui ne sera jamais débité, et geler ce qui le ferait varier.
	const [lockedAmount, setLockedAmount] = useState<number | null>(null);

	// Initialize Payment Intent
	const pi = usePaymentIntent({
		cartItems,
		email: isGuest ? undefined : session.user.email || undefined,
	});

	// [[CART-DISCOUNT-002]] Reprise du code promo appliqué au panier.
	// Sans ça, un code saisi dans le panier (« Réduction (SUMMER20) −20,00 € »
	// affichée dans le cart-sheet) était PERDU à l'arrivée sur /paiement :
	// `_appliedDiscount` démarrait à null, le PaymentIntent restait au plein
	// tarif et le client payait sans remise s'il ne re-saisissait pas le code.
	//
	// On repasse volontairement par `validateDiscountCode` (au lieu de faire
	// confiance au montant stocké sur le panier) : la remise est ainsi
	// re-dérivée serveur, avec la session courante — donc les limites par
	// utilisateur et l'éligibilité sont revérifiées ici aussi. Un code devenu
	// invalide est simplement ignoré, sans bloquer le paiement.
	const cartDiscountCode = cart.appliedDiscountCode;
	const hydratedDiscountRef = useRef(false);

	useEffect(() => {
		if (hydratedDiscountRef.current || !cartDiscountCode) return;
		hydratedDiscountRef.current = true;

		let cancelled = false;
		void validateDiscountCode(cartDiscountCode).then((result) => {
			if (cancelled || !result.valid || !result.discount) return;
			form.setFieldValue("_appliedDiscount", result.discount);
			form.setFieldValue("_discountOpen", true);
		});

		return () => {
			cancelled = true;
		};
	}, [cartDiscountCode, form]);

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
			const result = await validateDiscountCode(rawDiscountCode);
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

		// Montant réellement affiché sur le CTA au moment du clic — garde de
		// consentement côté serveur (CHECKOUT-CONSENT-001), jamais une base de
		// facturation. Recalculé ici avec les mêmes entrées que le récapitulatif.
		const country = ((s.country as string) || "FR") as ShippingCountry;
		const displayedShipping = calculateShipping(country, s.postalCode) ?? 0;
		const displayedTotal =
			lockedAmount ?? subtotal - (appliedDiscount?.discountAmount ?? 0) + displayedShipping;

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
			displayedTotal,
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
						lockedAmount={lockedAmount}
						getFormData={getFormData}
						allowNavigation={allowNavigation}
						onOrderBound={setLockedAmount}
					/>
				);
			}}
		</form.Subscribe>
	);
}
