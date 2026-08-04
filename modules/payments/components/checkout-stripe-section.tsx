"use client";

import { useRef, useState } from "react";
import { Elements, PaymentElement } from "@stripe/react-stripe-js";
import Link from "next/link";
import { ArrowSquareOutIcon, LockIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";
import { ROUTES } from "@/shared/constants/urls";
import { getStripe } from "@/shared/lib/stripe-client";
import { useStripeAppearance } from "../hooks/use-stripe-appearance";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { PayButton } from "./pay-button";
import { PaymentSectionSkeleton } from "./payment-section-skeleton";
import { StripeWordmark } from "./stripe-wordmark";

interface CheckoutStripeSectionProps {
	clientSecret: string;
	total: number;
	canSubmit: boolean;
	shippingUnavailable: boolean;
	isOnline: boolean;
	email?: string;
	billingName?: string;
	/** Forwarded to PayButton — sections incomplètes affichées dans le hint disabled. */
	incompleteSections?: string[];
	/** Montant figé une fois la commande liée au PI (CHECKOUT-CONSENT-001). */
	lockedAmount?: number | null;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	/** Called just before the Stripe redirect so beforeunload doesn't fire. */
	allowNavigation?: () => void;
	/** Remonte `finalAmount` dès que la commande est liée au PI. */
	onOrderBound?: (finalAmount: number) => void;
}

/**
 * Stripe card block: <Elements> wrapper, standard PaymentElement, PayButton and trust badges.
 *
 * Carte uniquement : le PaymentIntent est restreint à `payment_method_types: ["card"]`
 * côté serveur (`initialize-payment.ts`) — Link et les méthodes à redirection sont
 * exclus. Les wallets Apple Pay / Google Pay restent adossés au type `card` : leur
 * affichage dans le PaymentElement dépend de la config du dashboard Stripe (méthodes
 * activées + domaine Apple Pay enregistré), pas du code.
 *
 * Isolated in its own file so `checkout-form.tsx` can load it via `next/dynamic`
 * and keep the ~100KB `@stripe/react-stripe-js` bundle off the critical path.
 */
export function CheckoutStripeSection({
	clientSecret,
	total,
	canSubmit,
	shippingUnavailable,
	isOnline,
	email,
	billingName,
	incompleteSections,
	lockedAmount,
	getFormData,
	allowNavigation,
	onOrderBound,
}: CheckoutStripeSectionProps) {
	const [isPaymentReady, setIsPaymentReady] = useState(false);
	const appearance = useStripeAppearance();
	const cardContainerRef = useRef<HTMLDivElement>(null);

	/**
	 * Les champs carte vivent dans une iframe cross-origin : le focus à
	 * l'intérieur ne déclenche AUCUN scroll du document parent. Or ce bloc est le
	 * voisin immédiat de la barre CTA fixe sur mobile — au clavier ouvert il peut
	 * rester intégralement masqué, sans que le navigateur ne corrige quoi que ce
	 * soit. On remonte donc le conteneur nous-mêmes.
	 *
	 * `block: "nearest"` ne scrolle QUE si le bloc est hors de vue (pas de saut
	 * parasite desktop, ni entre numéro → expiration → CVC), et respecte le
	 * `scroll-padding-bottom` posé par `html:has([data-checkout-shell])` — c'est
	 * ce qui l'empêche d'atterrir derrière la barre.
	 */
	const scrollCardIntoView = () => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		cardContainerRef.current?.scrollIntoView({
			block: "nearest",
			behavior: reduce ? "auto" : "smooth",
		});
	};

	return (
		/*
		 * `key={clientSecret}` n'est PAS cosmétique : `clientSecret` est une prop
		 * IMMUABLE de `<Elements>`. react-stripe-js exclut explicitement cette clé de
		 * `elements.update()` (`extractAllowedOptionsUpdates(options, prevOptions,
		 * ['clientSecret', 'fonts'])`), donc un changement est silencieusement ignoré et
		 * les champs carte montés restent attachés à l'ANCIEN PaymentIntent.
		 *
		 * Or `pi.clientSecret` change bel et bien sous cette section, qui reste montée :
		 * `usePaymentIntent` re-initialise après 10 min d'onglet caché, et Stripe peut
		 * alors rendre un PI différent — la clé salée `-r2` de CHECKOUT-REPLAY-001, ou
		 * l'expiration 24 h de la clé d'idempotence. Dans les deux cas l'ancien PI est
		 * annulé (`cancelOrphanPaymentIntent`) : sans remontage, `confirmCheckout` liait
		 * la commande au NOUVEAU PI pendant que `stripe.confirmPayment` confirmait
		 * l'ANCIEN, déjà annulé → erreur dure, commande PENDING orpheline, aucun débit,
		 * et rien pour s'en sortir hors rechargement complet de la page. La reprise
		 * serveur ajoutée par CHECKOUT-REPLAY-001 n'atteignait jamais le client.
		 *
		 * Le remontage réinitialise la saisie carte : c'est le comportement correct, le
		 * PaymentIntent sous-jacent n'est plus le même.
		 * @see modules/payments/components/__tests__/elements-client-secret-remount.regression.test.ts
		 */
		<Elements
			key={clientSecret}
			stripe={getStripe()}
			options={{
				clientSecret,
				appearance,
				locale: "fr",
			}}
		>
			<div className="space-y-6">
				<p className="text-muted-foreground text-sm">
					Toutes les transactions sont sécurisées et chiffrées.
				</p>

				{!isPaymentReady && <PaymentSectionSkeleton />}

				<div className={cn("space-y-6", !isPaymentReady && "hidden")}>
					<div
						ref={cardContainerRef}
						className="bg-card border-primary/10 overflow-hidden rounded-2xl border p-4 shadow-sm"
					>
						<PaymentElement onReady={() => setIsPaymentReady(true)} onFocus={scrollCardIntoView} />
					</div>

					{/* Trust strip — kept above the sticky CTA on mobile so it stays visible */}
					<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
						<span className="inline-flex items-center gap-1">
							<LockIcon className="size-3" aria-hidden="true" />
							Paiement sécurisé
						</span>
						<span aria-hidden="true" className="text-border hidden sm:inline">
							|
						</span>
						<span className="inline-flex items-center gap-1">
							Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
						</span>
					</div>

					{/* Terms notice + Pay button */}
					<div className="space-y-3">
						<p className="text-muted-foreground text-center text-xs">
							En passant commande, tu acceptes nos{" "}
							<Link
								href={ROUTES.LEGAL.CGV}
								className="text-foreground inline-flex items-center gap-0.5 underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								conditions générales de vente
								<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
								<span className="sr-only">(ouvre dans un nouvel onglet)</span>
							</Link>{" "}
							et notre{" "}
							<Link
								href={ROUTES.LEGAL.PRIVACY}
								className="text-foreground inline-flex items-center gap-0.5 underline hover:no-underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								politique de confidentialité
								<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
								<span className="sr-only">(ouvre dans un nouvel onglet)</span>
							</Link>
							.
						</p>
						<PayButton
							total={total}
							disabled={!canSubmit}
							shippingUnavailable={shippingUnavailable}
							isOnline={isOnline}
							email={email}
							billingName={billingName}
							incompleteSections={incompleteSections}
							lockedAmount={lockedAmount}
							getFormData={getFormData}
							allowNavigation={allowNavigation}
							onOrderBound={onOrderBound}
						/>
					</div>
				</div>
			</div>
		</Elements>
	);
}
