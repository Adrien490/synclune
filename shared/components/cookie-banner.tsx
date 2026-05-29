"use client";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";
import { Button } from "./ui/button";
import Link from "next/link";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

/**
 * Cookie Banner RGPD conforme - Version simplifiée bas gauche
 *
 * Affiche un petit encart en bas à gauche avec 2 choix simples : accepter ou refuser.
 * Conforme CNIL :
 * - Choix simple, explicite et clair (aucun dismiss implicite via Escape)
 * - Boutons de poids visuel équivalent (Accepter et Refuser tous deux en variant
 *   secondary : deux boutons pleins neutres, aucune option privilégiée — reco CNIL)
 * - Durée: 6 mois
 *
 * Accessibilité :
 * - role="region" + aria-labelledby pointant sur le h2 (banner non-bloquant honnête,
 *   l'user peut continuer à interagir avec la page ; consentement enforced côté code
 *   via ConditionalAnalytics)
 * - Touch targets 44px minimum sur mobile (WCAG 2.5.5)
 * - Safe area iOS pour iPhone avec barre de navigation
 * - Support prefers-reduced-motion
 *
 * Optimisé pour React 19.2 - hydratation safe sans useState
 */
export function CookieBanner() {
	const bannerVisible = useCookieConsentStore((state) => state.bannerVisible);
	const acceptCookies = useCookieConsentStore((state) => state.acceptCookies);
	const rejectCookies = useCookieConsentStore((state) => state.rejectCookies);
	const _hasHydrated = useCookieConsentStore((state) => state._hasHydrated);
	const hasConsented = useHasConsented();
	const shouldReduceMotion = useReducedMotion();

	const shouldShow = _hasHydrated && !hasConsented && bannerVisible;

	if (!_hasHydrated) {
		return null;
	}

	return (
		<AnimatePresence>
			{shouldShow && (
				<m.div
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					transition={{
						duration: shouldReduceMotion ? 0 : MOTION_CONFIG.duration.slow,
						ease: MOTION_CONFIG.easing.easeOut,
					}}
					className="fixed right-4 bottom-[calc(var(--bottom-bar-height,0px)+max(1rem,env(safe-area-inset-bottom)))] left-4 z-(--z-alert) w-auto max-w-[calc(100vw-2rem)] md:right-auto md:bottom-6 md:left-6 md:max-w-md"
					role="region"
					aria-live="polite"
					aria-labelledby="cookie-title"
					aria-describedby="cookie-description"
				>
					<div className="bg-background/95 border-primary/15 space-y-3 rounded-xl border p-4 shadow-lg backdrop-blur-md md:space-y-4 md:p-6">
						<h2 id="cookie-title" className="text-foreground text-base font-semibold">
							Cookies
						</h2>

						<p id="cookie-description" className="text-muted-foreground text-sm leading-relaxed">
							Nous utilisons des cookies optionnels à des fins de statistiques de navigation pour
							améliorer votre expérience.
							<span className="sr-only">
								{" "}
								Votre choix sera mémorisé pendant 6 mois conformément aux recommandations CNIL.
							</span>
						</p>

						<div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
							<Link
								href="/cookies"
								className="text-foreground focus-visible:ring-ring/50 py-1 underline outline-none focus-visible:rounded-sm focus-visible:ring-2"
								aria-label="En savoir plus sur les cookies"
							>
								En savoir plus
							</Link>
							<Link
								href="/confidentialite"
								className="text-foreground focus-visible:ring-ring/50 py-1 underline outline-none focus-visible:rounded-sm focus-visible:ring-2"
							>
								Politique de confidentialité
							</Link>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={acceptCookies}
								variant="secondary"
								size="sm"
								className="min-h-11 flex-1"
							>
								Accepter
							</Button>
							<Button
								onClick={rejectCookies}
								variant="secondary"
								size="sm"
								className="min-h-11 flex-1"
							>
								Refuser
							</Button>
						</div>
					</div>
				</m.div>
			)}
		</AnimatePresence>
	);
}
