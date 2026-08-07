"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { LockIcon, ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { formatEuro } from "@/shared/utils/format-euro";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useCheckoutSubmit } from "../hooks/use-checkout-submit";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";
import { SHIPPING_UNAVAILABLE } from "../constants/shipping-unavailable";

interface PayButtonProps {
	total: number;
	disabled: boolean;
	shippingUnavailable: boolean;
	isOnline: boolean;
	email?: string;
	billingName?: string;
	/**
	 * Liste ordonnée des sections incomplètes (Contact, Livraison...) à corriger.
	 * Si fournie et non-vide alors que `disabled` est true, remplace le hint
	 * générique "Remplis tous les champs obligatoires" par un message précis.
	 */
	incompleteSections?: string[];
	/**
	 * Montant figé par le serveur une fois la commande liée au PaymentIntent
	 * (CHECKOUT-CONSENT-001). Non nul ⇒ c'est CE montant qui sera débité, quelles
	 * que soient les modifications faites depuis dans le formulaire.
	 */
	lockedAmount?: number | null;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	/** Called just before the Stripe redirect so beforeunload doesn't fire. */
	allowNavigation?: () => void;
	/** Remonte `finalAmount` au parent dès que la commande est liée au PI. */
	onOrderBound?: (finalAmount: number) => void;
}

type Phase = "idle" | "validating" | "creating-order" | "awaiting-3ds";

/**
 * Payment button inside <Elements>.
 * Orchestrates: validate form -> confirmCheckout server action -> stripe.confirmPayment.
 *
 * Phases surface distinct messages so users understand latency (esp. 3DS challenge).
 */
export function PayButton({
	total,
	disabled,
	shippingUnavailable,
	isOnline,
	email,
	billingName,
	incompleteSections,
	lockedAmount,
	getFormData,
	allowNavigation,
	onOrderBound,
}: PayButtonProps) {
	const stripe = useStripe();
	const elements = useElements();
	const haptic = useHaptic();
	const [phase, setPhase] = useState<Phase>("idle");
	// UN seul state pour l'erreur et son action de reprise : les deux étaient
	// toujours écrits sur les mêmes chemins (même ligne à chaque fois), donc ils ne
	// pouvaient pas diverger. Les tenir séparément laissait la porte ouverte à un
	// bouton « Recharger la page » orphelin, sans message.
	const [error, setError] = useState<{ message: string; canReload: boolean } | null>(null);
	const errorRef = useRef<HTMLDivElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	const hintId = useId();

	const submit = useCheckoutSubmit({
		getFormData,
		allowNavigation,
		onPhase: setPhase,
		onOrderBound,
	});

	// Une fois la commande liée au PI, le montant autoritaire est celui du serveur.
	const amountToPay = lockedAmount ?? total;

	// Bring error into view on mobile where the sticky CTA may otherwise hide it.
	useEffect(() => {
		if (error && errorRef.current) {
			const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			errorRef.current.scrollIntoView({
				behavior: reduceMotion ? "auto" : "smooth",
				block: "nearest",
			});
			errorRef.current.focus({ preventScroll: true });
		}
	}, [error]);

	/**
	 * Publie la hauteur RÉELLE de la barre fixe dans `--pay-bar-height`.
	 *
	 * Elle n'est pas constante : les Alerts 3DS / carte refusée et le hint
	 * « À compléter… » s'empilent dedans et la font passer de ~72px à ~200px.
	 * Une réserve figée (l'ancien `pb-32` du formulaire) est donc dépassée dès
	 * la première erreur de paiement, et la barre recouvre le bas du formulaire.
	 * Consommée par la réserve de `checkout-form-body` et par le
	 * `scroll-padding-bottom` de `html:has([data-checkout-shell])`.
	 */
	useEffect(() => {
		const el = barRef.current;
		if (!el || typeof ResizeObserver === "undefined") return;

		const root = document.documentElement;
		const apply = () => {
			const height = Math.round(el.getBoundingClientRect().height);
			// Pendant le mount de Stripe, la barre vit dans le conteneur `hidden` de
			// checkout-stripe-section : mesurer 0 et l'écrire ferait osciller la
			// hauteur du document (fallback 8rem → 1rem → réel). On garde le
			// fallback CSS tant qu'il n'y a pas de vraie mesure.
			if (height === 0) return;
			root.style.setProperty("--pay-bar-height", `${height}px`);
		};

		apply();
		const observer = new ResizeObserver(apply);
		observer.observe(el);

		return () => {
			observer.disconnect();
			root.style.removeProperty("--pay-bar-height");
		};
	}, []);

	const isProcessing = phase !== "idle";
	const isAwaiting3ds = phase === "awaiting-3ds";

	/**
	 * Deux familles de blocage, deux traitements.
	 *
	 * `disabled` NATIF pour ce que le formulaire ne peut pas réparer et où le clic
	 * ne doit rien déclencher : Stripe.js pas chargé, soumission en cours (garde de
	 * ré-entrance), zone non livrable, hors ligne.
	 *
	 * `aria-disabled` SEUL pour l'incomplétude du formulaire : un `disabled` natif
	 * sort le bouton du tab order, si bien qu'un utilisateur clavier arrivait en fin
	 * de formulaire sans aucun contrôle focusable ni explication (le hint
	 * « À compléter : … » n'était relié à rien). Pire : le bouton basculait en
	 * `disabled` PENDANT qu'il avait le focus, ce qui renvoie le focus au <body>.
	 * En `aria-disabled`, le bouton reste focusable et le clic route vers
	 * `getFormData()` → `focusFirstInvalid()`, qui EST le comportement utile.
	 * Audit UI/UX paiement 2026-07-26, F6.
	 */
	const isHardBlocked = !stripe || !elements || isProcessing || shippingUnavailable || !isOnline;
	const isFormIncomplete = disabled && !isHardBlocked;

	const hint = !isOnline
		? "Vérifie ta connexion internet pour continuer."
		: shippingUnavailable
			? SHIPPING_UNAVAILABLE.payButton
			: disabled && !isProcessing
				? incompleteSections && incompleteSections.length > 0
					? `À compléter : ${incompleteSections.join(", ")}`
					: "Remplis tous les champs obligatoires pour continuer."
				: null;

	function showError(message: string, canReload = false) {
		setError({ message, canReload });
		haptic("error");
	}

	async function handleClick() {
		if (!stripe || !elements) return;
		// Le bouton reste cliquable en `aria-disabled` : c'est volontaire, `submit()`
		// enchaîne sur `getFormData()` qui valide et focus le premier champ invalide.
		// On garde en revanche la garde de ré-entrance et les blocages durs.
		if (isHardBlocked) return;

		haptic("medium");
		setError(null);

		try {
			const result = await submit({
				returnUrlSuffix: "",
				paymentMethodData: {
					billing_details: {
						...(billingName && { name: billingName }),
						...(email && { email }),
					},
				},
			});

			switch (result.status) {
				case "form-invalid":
				case "submit-error":
				case "checkout-error":
				case "stripe-error":
					// La famille `checkout-error` regroupe les refus serveur dont la
					// plupart prescrivent « Actualise la page » (panier modifié, prix
					// changés, commande déjà initiée…) : fournir le contrôle au lieu de
					// décrire un geste. Pas sur `stripe-error` (refus de carte) : là,
					// réessayer SANS recharger est le bon chemin.
					if (result.status !== "form-invalid") {
						showError(result.message, result.status === "checkout-error");
					}
					setPhase("idle");
					return;
				case "redirecting":
					// Successful path — Stripe will redirect the page, nothing else to do.
					return;
			}
		} catch {
			showError("Une erreur inattendue est survenue. Réessaye.");
			setPhase("idle");
		}
	}

	const phaseMessage =
		phase === "validating"
			? "Validation…"
			: phase === "creating-order"
				? "Création de la commande…"
				: phase === "awaiting-3ds"
					? "Vérification 3D Secure…"
					: "";

	return (
		<div
			ref={barRef}
			data-hide-on-keyboard=""
			className="border-primary/10 bg-background/95 fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0_/_0.08)] backdrop-blur-md lg:static lg:space-y-3 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
		>
			{/*
			 * Région live des phases de paiement (A11Y-AUDIT-001).
			 * Le texte visible du bouton change selon `phase`, mais un élément déjà
			 * focusé ne réémet pas son nom au changement → les SR n'annoncent pas la
			 * progression. Cette région sr-only annonce "Validation…", "Création de
			 * la commande…", etc. La phase 3DS garde en plus son Alert visible ci-dessous.
			 */}
			<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{phaseMessage}
			</span>

			{isAwaiting3ds && (
				<Alert role="status" aria-live="polite">
					<ShieldCheckIcon className="size-4" aria-hidden="true" />
					<AlertDescription>
						Vérification 3D Secure en cours, une fenêtre de ta banque va s&apos;ouvrir.
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert
					ref={errorRef}
					tabIndex={-1}
					variant="destructive"
					role="alert"
					aria-live="assertive"
					className="focus-visible:outline-none"
				>
					<AlertDescription className="space-y-3">
						<p>{error.message}</p>
						{error.canReload && (
							<Button
								type="button"
								size="sm"
								variant="outline"
								// `allowNavigation()` AVANT le reload : sinon `useUnsavedChanges`
								// déclenche son `beforeunload` et l'utilisateur doit confirmer
								// une perte de données pour l'action qu'il vient de demander.
								onClick={() => {
									allowNavigation?.();
									window.location.reload();
								}}
							>
								Recharger la page
							</Button>
						)}
					</AlertDescription>
				</Alert>
			)}

			<Button
				type="button"
				size="lg"
				className="min-h-11 w-full touch-manipulation text-base shadow-md hover:shadow-lg aria-disabled:opacity-60 motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:active:scale-[0.98]"
				disabled={isHardBlocked}
				aria-disabled={isFormIncomplete || undefined}
				aria-describedby={hint ? hintId : undefined}
				aria-busy={isProcessing}
				onClick={handleClick}
				style={{ viewTransitionName: "checkout-pay-cta" }}
			>
				{isProcessing ? (
					<>
						<Spinner presentational />
						<span>{phaseMessage || "Traitement…"}</span>
					</>
				) : (
					<>
						<LockIcon className="size-4" aria-hidden="true" />
						<span>Commander et payer {formatEuro(amountToPay)}</span>
					</>
				)}
			</Button>

			{/* Un seul nœud de hint, porteur de `hintId` : c'est lui que le bouton
			    référence en `aria-describedby`. Auparavant les trois variantes étaient
			    des <p> distincts sans identifiant, donc le motif du blocage n'était
			    jamais rattaché au contrôle bloqué. */}
			{hint !== null && (
				<p
					id={hintId}
					className={
						!isOnline || shippingUnavailable
							? "text-destructive text-center text-sm"
							: "text-muted-foreground text-center text-xs lg:text-sm"
					}
					{...(!isOnline || shippingUnavailable ? { role: "alert" } : {})}
				>
					{hint}
				</p>
			)}
		</div>
	);
}
