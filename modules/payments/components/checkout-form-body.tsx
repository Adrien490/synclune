"use client";

import { useEffect, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { LockIcon, WarningCircleIcon, WifiSlashIcon } from "@phosphor-icons/react/ssr";
import type { Session } from "@/modules/auth/lib/auth";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import type { ShippingCountry } from "@/shared/constants/countries";
import type { getShippingInfo } from "@/modules/orders/services/shipping.service";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import type { useCheckoutForm } from "../hooks/use-checkout-form";
import type { usePaymentIntent } from "../hooks/use-payment-intent";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutSection } from "./checkout-section";
import { ShippingMethodSection } from "./shipping-method-section";
import { CheckoutContactSection } from "./checkout-contact-section";
import { CheckoutAddressFields } from "./checkout-address-fields";
import { CheckoutErrorSummary } from "./checkout-error-summary";
import { PaymentSectionSkeleton } from "./payment-section-skeleton";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { BRAND } from "@/shared/constants/brand";
import {
	AMOUNT_LOCK_ALERT_ID,
	buildCheckoutFieldErrors,
	getCompletedSections,
	getIncompleteSections,
} from "../constants/checkout-fields";

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
	isGuest: boolean;
	isOnline: boolean;
	pi: ReturnType<typeof usePaymentIntent>;
	subtotal: number;
	shipping: number;
	shippingInfo: ReturnType<typeof getShippingInfo>;
	shippingUnavailable: boolean;
	total: number;
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
	isGuest,
	isOnline,
	pi,
	subtotal,
	shipping,
	shippingInfo,
	shippingUnavailable,
	total,
	country,
	postalCode,
	lockedAmount,
	getFormData,
	allowNavigation,
	onOrderBound,
}: CheckoutFormBodyProps) {
	// Keep Stripe PaymentIntent amount in sync with country/postalCode changes
	// so the card PaymentElement charges the correct total.
	// `updateAmount` is debounced 500ms internally.
	const isAmountLocked = lockedAmount !== null;
	const syncStripeAmount = useEffectEvent(() => {
		// Commande déjà liée au PI : le serveur refuse l'update (`metadata.orderId`),
		// inutile de solliciter l'action.
		if (!pi.paymentIntentId || shippingUnavailable || isAmountLocked) return;
		pi.updateAmount(country, postalCode);
	});

	useEffect(() => {
		syncStripeAmount();
	}, [pi.paymentIntentId, country, postalCode, shippingUnavailable, isAmountLocked]);

	return (
		<form
			ref={formRef}
			onSubmit={(e) => e.preventDefault()}
			noValidate
			aria-label="Formulaire de paiement"
			// Réserve = hauteur réelle de la barre CTA fixe (publiée par PayButton),
			// pas une constante : la barre grossit quand une Alert s'y empile.
			// Levée à `lg:` — le breakpoint où la barre repasse `static`, où la grille passe
			// à deux colonnes et où le résumé devient une sidebar. Elle avait été avancée à
			// `md:`, ce qui supprimait la réserve entre 48 et 64rem alors que la barre y était
			// encore `fixed` : elle recouvrait le bas du formulaire sur iPad portrait.
			// Audit UI/UX paiement 2026-07-26, F5.
			className="grid gap-6 pb-[calc(var(--pay-bar-height,8rem)+1rem)] lg:grid-cols-[1fr_360px] lg:gap-8 lg:pb-0"
		>
			<div className="space-y-8">
				{/*
				 * Résumé d'erreurs — en TÊTE de formulaire, au-dessus de la section
				 * Contact. Il agrège les erreurs de TOUTES les sections (email compris) :
				 * rendu plus bas, il se retrouvait sous les champs qu'il désigne.
				 *
				 * C'est LUI qui reçoit le focus à la soumission (WCAG 3.3.1), pas le
				 * premier champ invalide : les deux se disputaient le focus pendant que
				 * sept régions live parlaient en même temps. Depuis, les champs se
				 * taisent après une soumission et ce bloc est le canal unique — vue
				 * d'ensemble annoncée en `aria-live="assertive"`, avec un bouton de saut
				 * par erreur. Audit a11y checkout 2026-08-07.
				 */}
				<form.Subscribe
					selector={(s) => ({
						submissionAttempts: s.submissionAttempts,
						canSubmit: s.canSubmit,
						fieldMeta: s.fieldMeta,
					})}
				>
					{({ submissionAttempts, canSubmit, fieldMeta }) => {
						if (submissionAttempts === 0 || canSubmit) return null;

						return (
							<CheckoutErrorSummary
								fieldErrors={buildCheckoutFieldErrors(
									fieldMeta as Record<string, { errors: string[] }>,
								)}
							/>
						);
					}}
				</form.Subscribe>

				{/* Note « champs obligatoires » — en tête de <form>, donc AVANT le champ
					    email requis de la section Contact. Elle vivait dans le fieldset
					    Livraison, c'est-à-dire sous le premier champ qu'elle décrit. */}
				<RequiredFieldsNote />

				{!isOnline && (
					<Alert variant="destructive" role="alert" aria-live="assertive">
						<WifiSlashIcon className="size-4" aria-hidden="true" />
						<AlertTitle>Connexion internet perdue</AlertTitle>
						<AlertDescription>
							Vérifie ta connexion internet avant de continuer. Le paiement nécessite une connexion
							active.
						</AlertDescription>
					</Alert>
				)}

				{pi.error && (
					<Alert variant="destructive" role="alert">
						<WarningCircleIcon className="size-4" aria-hidden="true" />
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
						// `id` : c'est la cible de l'`aria-describedby` des deux champs gelés
						// (pays, code postal). Sans ce lien, un utilisateur au clavier voyait
						// simplement les deux champs DISPARAÎTRE de son parcours, sans motif.
						<Alert id={AMOUNT_LOCK_ALERT_ID} role="status">
							<LockIcon className="size-4" aria-hidden="true" />
							<AlertTitle>Montant verrouillé</AlertTitle>
							{/*
							 * La copie promettait « Actualise la page si tu veux modifier ta livraison
							 * ou ton code promo » — c'était FAUX dans les deux sens : le serveur refuse
							 * toute resoumission dont le pays ou le code postal diverge de la commande
							 * liée (`resolveIdempotentHit`), et le rechargement ne « débloquait » rien.
							 * On dit maintenant ce qui est réellement possible, et on fournit le
							 * contrôle au lieu de décrire un geste. Audit UI/UX paiement 2026-07-26, F2.
							 */}
							<AlertDescription className="space-y-3">
								<p>
									Ta commande est enregistrée : le montant ne changera plus. Tu peux réessayer le
									paiement avec une autre carte.
								</p>
								<p>
									Tu peux encore corriger ta rue, ta ville ou ton nom — c&apos;est la nouvelle
									adresse qui sera utilisée pour l&apos;envoi. Le pays et le code postal, eux,
									restent figés : ils déterminent les frais de livraison, donc le montant.
								</p>
								<p>
									Besoin de changer de zone de livraison ? Écris-nous à{" "}
									<a href={`mailto:${BRAND.contact.email}`} className="underline">
										{BRAND.contact.email}
									</a>
									, on s&apos;en occupe.
								</p>
								<Button
									type="button"
									size="sm"
									variant="outline"
									// `allowNavigation()` AVANT le reload : sinon `useUnsavedChanges`
									// déclenche son `beforeunload` et l'utilisateur doit confirmer une
									// perte de données pour une action qu'il vient de demander.
									onClick={() => {
										allowNavigation();
										window.location.reload();
									}}
								>
									Recharger la page
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{/*
					 * CHECKOUT-CONSENT-001 — une fois la commande liée au PaymentIntent, le
					 * montant est figé côté serveur. On gèle donc ce qui le ferait varier, plutôt
					 * que d'afficher un récapitulatif qui ne correspondrait plus au débit.
					 *
					 * ⚠️ Le gel ne porte PAS sur toute l'adresse. Seuls le pays et le code postal
					 * déterminent le tarif d'expédition ; la rue, le complément, la ville, le nom
					 * et le téléphone n'ont aucun effet sur le total, et le serveur répercute
					 * désormais leur correction sur le snapshot de la commande (KI-001, cf.
					 * `updatePendingOrderShippingSnapshot`). Les geler ici rendrait ce chemin de
					 * réparation inatteignable — c'est le scénario du défaut lui-même : faute de
					 * frappe dans la rue, carte refusée, et plus aucun moyen de corriger.
					 *
					 * D'où deux périmètres distincts : `lockDestination` sur les 2 champs
					 * tarifaires, `<fieldset disabled>` sur les sections qui portent le montant.
					 */}
					{/*
					 * La progression est portée par les QUATRE accents de marque — rose,
					 * lavande, menthe, soleil — en filet de 3px sur le flanc de chaque
					 * section. Ils dormaient depuis le vidage de la landing ; ici ils
					 * font un travail : dire où l'on en est. Jamais en encre (1,5 à
					 * 2,5:1 sur le fond), toujours en surface.
					 */}
					{/*
					 * ⚠️ Le sélecteur rend une CHAÎNE, pas un objet — et surtout pas
					 * `s.values`. Une souscription à `values` change à chaque frappe : elle
					 * re-rendrait `CheckoutAddressFields`, donc TOUS les champs, sur chaque
					 * caractère saisi. C'est le même piège que celui qui a fait extraire
					 * `AddressAutocompleteField` de son parent (« Must live outside
					 * CheckoutAddressFields to avoid re-mounting on every keystroke »).
					 * Le calcul est fait DANS le sélecteur, qui n'émet que la liste des
					 * sections complétées : le rendu ne repart que quand une étape bascule.
					 */}
					<form.Subscribe
						selector={(s) => {
							const meta = s.fieldMeta as Record<string, { errors: string[] }>;
							const invalidPaths = Object.entries(meta)
								.filter(([, m]) => m.errors.length > 0)
								.map(([name]) => name);
							const values = s.values as { email?: unknown; shipping: Record<string, unknown> };
							const filledPaths = [
								...(String(values.email ?? "").trim() ? ["email"] : []),
								...Object.entries(values.shipping)
									.filter(([, v]) => String(v ?? "").trim().length > 0)
									.map(([key]) => `shipping.${key}`),
							];
							// Objet plutôt que chaîne nue : `Subscribe` type son sélecteur ainsi.
							// La comparaison shallow de TanStack porte alors sur la CHAÎNE, donc
							// le bénéfice reste entier — pas de re-rendu tant qu'aucune étape ne bascule.
							return {
								completedKey: getCompletedSections(filledPaths, invalidPaths, isGuest).join("|"),
							};
						}}
					>
						{({ completedKey }) => {
							const completed = new Set(completedKey ? completedKey.split("|") : []);

							return (
								<div className="flex min-w-0 flex-col gap-8">
									{/* === SECTION 1: Contact === */}
									<CheckoutContactSection
										form={form}
										session={session}
										isComplete={completed.has("Contact")}
									/>

									{/* === SECTION 2: Shipping Address === */}
									<CheckoutSection
										title="Livraison"
										accent="lavender"
										isComplete={completed.has("Livraison")}
									>
										<CheckoutAddressFields form={form} lockDestination={isAmountLocked} />
									</CheckoutSection>
								</div>
							);
						}}
					</form.Subscribe>

					{/*
					 * ⚠️ Plus de `<fieldset disabled={isAmountLocked}>` ici.
					 *
					 * Il n'enveloppait que « Frais et délai de livraison », section en LECTURE
					 * SEULE : `ShippingMethodSection` ne rend pas un seul contrôle de
					 * formulaire. Or le `disabled` d'un fieldset ne désactive que les contrôles
					 * qu'il contient — il n'en désactivait donc AUCUN, tandis que sa `<legend>`
					 * annonçait au lecteur d'écran un groupe de saisie inexistant.
					 *
					 * Le vrai gel du montant porte sur les deux champs qui déterminent le tarif
					 * (pays, code postal) via `lockDestination` — et ceux-là sont désormais
					 * reliés à l'alerte « Montant verrouillé » par `aria-describedby`.
					 * Audit a11y checkout 2026-08-07.
					 */}
					<div className="flex min-w-0 flex-col gap-8">
						{/* === SECTION 3: Shipping cost & lead time === */}
						{/* Pas « Mode d'expédition » : le tarif est unique par zone, la section
						    est en lecture seule et n'offre aucun choix — le titre promettait une
						    sélection inexistante. Pas « Livraison » non plus : la section 2
						    (adresse) porte déjà ce titre. */}
						{/*
						 * `isComplete` dérivé du TARIF RÉSOLU, pas de l'état des champs — d'où
						 * un calcul en ligne plutôt qu'une entrée dans `getCompletedSections`,
						 * qui raisonne sur des paths de formulaire. Cette section n'a aucune
						 * saisie, mais elle a bien un état résolu (un tarif et un délai) et un
						 * état non résolu (code postal absent, ou zone non livrable) : sans ça,
						 * seules 2 des 4 étapes pouvaient porter le repère.
						 */}
						<CheckoutSection
							title="Frais et délai de livraison"
							accent="mint"
							isComplete={!shippingUnavailable && shippingInfo !== null}
						>
							<ShippingMethodSection
								shipping={shipping}
								shippingUnavailable={shippingUnavailable}
								shippingInfo={shippingInfo}
							/>
						</CheckoutSection>
					</div>

					{/* === SECTION 4: Payment === */}
					<CheckoutSection title="Paiement" accent="sun">
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
				/>
			</div>
		</form>
	);
}
