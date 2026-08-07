"use client";

import { useState, useSyncExternalStore } from "react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import type { Session } from "@/modules/auth/lib/auth";
import { calculateShipping, getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ShippingCountry } from "@/shared/constants/countries";
import { useCheckoutForm } from "../hooks/use-checkout-form";
import { usePaymentIntent } from "../hooks/use-payment-intent";

import { CheckoutFormBody } from "./checkout-form-body";
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
}

/**
 * Single-page checkout form (Shopify-style).
 *
 * Sections: Contact, Livraison, Frais et délai de livraison, Paiement.
 * Payment via Stripe PaymentElement — carte uniquement (pas de paiement express).
 */
export function CheckoutForm({ cart, session }: CheckoutFormProps) {
	const isGuest = !session;
	// Seul `formRef` sert ici : le focus post-soumission appartient à
	// `CheckoutErrorSummary`. Le hook reste pour le câblage `onInvalidCapture`.
	const { formRef } = useFocusFirstError();

	const { form } = useCheckoutForm({ session });

	// Warn on tab close / back button when the form has been touched.
	// Disabled once the user reaches the Stripe redirect via `allowNavigation()`.
	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, true, {
		message: "Tes informations de commande seront perdues si tu quittes cette page.",
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

	/**
	 * Réhydratation du verrou après un RECHARGEMENT de page.
	 *
	 * `onOrderBound` ne couvre que la vie de l'onglet. Or le scénario le plus courant
	 * est : carte refusée → l'Alert invite à actualiser → au remontage `lockedAmount`
	 * repartait à `null`, le formulaire se dégelait, et `updatePaymentAmount` renvoyait
	 * « Commande déjà initiée — actualise la page » avec un bouton « Réessayer » qui
	 * rejouait la même séquence. Impasse fermée.
	 *
	 * Le serveur nous dit maintenant si une commande PENDING est déjà liée au PI
	 * (`boundAmount`) : on reprend ce montant comme verrou dès qu'il arrive.
	 *
	 * Calculé PENDANT le rendu (pas dans un `useEffect`) : `boundAmount` arrive de
	 * façon asynchrone, un initialiseur de `useState` ne le verrait jamais.
	 * Audit UI/UX paiement 2026-07-26, F2.
	 */
	const [rehydratedFromBound, setRehydratedFromBound] = useState(false);
	if (!rehydratedFromBound && pi.boundAmount !== null) {
		setRehydratedFromBound(true);
		if (lockedAmount === null) setLockedAmount(pi.boundAmount);
	}

	/**
	 * La commande vient d'être liée au PaymentIntent : on gèle l'affichage sur le
	 * montant autoritaire, et on annule d'abord toute mise à jour de montant encore en
	 * attente dans le debounce. Sans ça, une correction de code postal suivie d'un clic
	 * sur Payer dans les 500 ms faisait arriver l'appel après la liaison : le serveur le
	 * refusait correctement, mais le client affichait « Commande déjà initiée » +
	 * « Réessayer » pendant l'ouverture de la fenêtre 3D Secure (F5).
	 */
	function handleOrderBound(finalAmount: number) {
		pi.cancelPendingUpdate();
		setLockedAmount(finalAmount);
	}

	/**
	 * Builds ConfirmCheckoutData from the current form state.
	 * Called by PayButton before submission.
	 * Returns null if validation fails (triggers form errors).
	 */
	async function getFormData(): Promise<ConfirmCheckoutData | null> {
		const values = form.state.values;
		const s = values.shipping;

		// Trigger full form validation + increment submissionAttempts
		await form.handleSubmit();

		if (!form.state.canSubmit) {
			// `_handleSubmit` sort en avance AVANT `validateAllFields` quand
			// `!canSubmit && submissionAttempts <= 1` (FormApi). Conséquence : si un seul
			// champ portait déjà une erreur au premier clic, les autres champs invalides
			// n'étaient jamais validés — le résumé n'en listait qu'un et il fallait
			// recliquer pour voir le reste. Cette passe est idempotente et défait
			// l'early-return.
			await form.validateAllFields("submit");

			// ⚠️ Pas de `focusFirstInvalid()` ici : c'est `CheckoutErrorSummary` qui
			// prend le focus (`focusOnAppear`), motif canonique du résumé d'erreurs.
			// Les deux ensemble se disputaient le focus tout en laissant sept régions
			// live parler en même temps (audit a11y 2026-08-07). `focusFirstInvalid`
			// reste le chemin des formulaires SANS résumé.
			// L'haptique d'erreur, elle, appartient bien à la soumission.
			triggerHaptic("error");
			return null;
		}

		// Montant réellement affiché sur le CTA au moment du clic — garde de
		// consentement côté serveur (CHECKOUT-CONSENT-001), jamais une base de
		// facturation. Recalculé ici avec les mêmes entrées que le récapitulatif.
		const country = ((s.country as string) || "FR") as ShippingCountry;
		const displayedShipping = calculateShipping(country, s.postalCode) ?? 0;
		const displayedTotal = lockedAmount ?? subtotal + displayedShipping;

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
			paymentIntentId: pi.paymentIntentId!,
			displayedTotal,
		};
	}

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
				const total = subtotal + shipping;
				const shippingInfo = getShippingInfo(country, postalCode as string);

				return (
					<CheckoutFormBody
						form={form}
						formRef={formRef}
						cart={cart}
						session={session}
						isGuest={isGuest}
						isOnline={isOnline}
						pi={pi}
						subtotal={subtotal}
						shipping={shipping}
						shippingInfo={shippingInfo}
						shippingUnavailable={shippingUnavailable}
						total={total}
						country={country}
						postalCode={postalCode as string}
						lockedAmount={lockedAmount}
						getFormData={getFormData}
						allowNavigation={allowNavigation}
						onOrderBound={handleOrderBound}
					/>
				);
			}}
		</form.Subscribe>
	);
}
