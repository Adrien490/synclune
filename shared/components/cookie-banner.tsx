"use client";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";
import { Button } from "./ui/button";
import Link from "next/link";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

/**
 * Cookie Banner RGPD conforme - Version simplifiée bas gauche
 *
 * Affiche un petit encart en bas à gauche avec 2 choix simples : accepter ou refuser.
 * Conforme CNIL :
 * - Choix simple, explicite et clair (aucun dismiss implicite via Escape)
 * - Boutons de poids visuel strictement égal : Accepter et Refuser tous deux en
 *   variant outline (même bordure, aucun aplat de couleur, aucune option
 *   privilégiée — doctrine dark patterns CNIL 2024). Décision 2026-08-03 ;
 *   remplace les deux `secondary` (jaune pastel, donc pas « neutres ») qui
 *   avaient eux-mêmes écrasé la décision de l'audit 2026-05-19.
 * - Durée : 6 mois, annoncée visiblement sous la description
 *
 * Accessibilité :
 * - role="region" + aria-labelledby pointant sur le h2 (banner non-bloquant honnête,
 *   l'user peut continuer à interagir avec la page ; consentement enforced côté code
 *   via le gating RGPD de trackEvent — cf. shared/lib/analytics/track.ts)
 * - PAS d'aria-live ici : la région entre dans le DOM avec son contenu
 *   (AnimatePresence), elle ne serait donc jamais vocalisée (même piège que
 *   count-badge.tsx) — et un landmark contenant liens et boutons n'est pas une
 *   live region. La réapparition déclenchée par le footer est annoncée par
 *   `announce()` dans ManageCookiesButton.
 * - Touch targets 44px (size default du Button : h-11 natif, pas de min-h hack)
 * - Safe area iOS pour iPhone avec barre de navigation
 * - Support prefers-reduced-motion via maybeReduceMotion (SSOT motion.config)
 *
 * Partis pris assumés (audit 2026-08-03) :
 * - z-(--z-alert) (80) > scrims Sheet/Drawer (--z-overlay 75) : l'encart reste
 *   visible et actionnable même panier ouvert — cohérent avec le non-bloquant.
 * - Les toasts Sonner (z hors échelle) partagent la même bande basse mobile
 *   (même offset --bottom-bar-height) : recouvrement transitoire accepté.
 */
export function CookieBanner() {
	const bannerVisible = useCookieConsentStore((state) => state.bannerVisible);
	const acceptCookies = useCookieConsentStore((state) => state.acceptCookies);
	const rejectCookies = useCookieConsentStore((state) => state.rejectCookies);
	const _hasHydrated = useCookieConsentStore((state) => state._hasHydrated);
	const hasConsented = useHasConsented();
	const prefersReducedMotion = useReducedMotion() ?? false;

	const shouldShow = _hasHydrated && !hasConsented && bannerVisible;

	return (
		<AnimatePresence>
			{shouldShow && (
				<m.div
					initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					transition={maybeReduceMotion(
						{
							duration: MOTION_CONFIG.duration.slow,
							ease: MOTION_CONFIG.easing.easeOut,
						},
						prefersReducedMotion,
					)}
					// `--bottom-bar-height` porte la hauteur MESURÉE, safe-area incluse : la
					// réadditionner compterait l'encoche deux fois. Le `max(…, env(…))` ne
					// couvre que le cas SANS barre (audit bottom-bar 2026-07-30).
					className="fixed right-4 bottom-[max(calc(var(--bottom-bar-height,0px)+1rem),env(safe-area-inset-bottom,0px))] left-4 z-(--z-alert) w-auto max-w-[calc(100vw-2rem)] md:right-auto md:bottom-[max(calc(var(--bottom-bar-height,0px)+1.5rem),env(safe-area-inset-bottom,0px))] md:left-6 md:max-w-md"
					role="region"
					aria-labelledby="cookie-title"
					aria-describedby="cookie-description"
				>
					<div className="bg-background/95 border-primary/15 space-y-3 rounded-xl border p-4 shadow-lg backdrop-blur-md md:space-y-4 md:p-6">
						<h2 id="cookie-title" className="text-foreground text-base font-semibold">
							Cookies
						</h2>

						<p id="cookie-description" className="text-muted-foreground text-sm leading-relaxed">
							Nous utilisons des traceurs optionnels pour rejouer de façon anonymisée un échantillon
							de sessions de navigation (textes et saisies masqués) et améliorer ton expérience.
						</p>

						<p className="text-muted-foreground text-xs">Ton choix sera mémorisé pendant 6 mois.</p>

						<div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
							<Link
								href="/cookies"
								className="focus-ring text-foreground rounded-sm py-1 underline"
								aria-label="En savoir plus sur les cookies"
							>
								En savoir plus
							</Link>
							<Link
								href="/confidentialite"
								className="focus-ring text-foreground rounded-sm py-1 underline"
							>
								Politique de confidentialité
							</Link>
						</div>

						<div className="flex gap-2">
							<Button onClick={acceptCookies} variant="outline" className="flex-1">
								Accepter
							</Button>
							<Button onClick={rejectCookies} variant="outline" className="flex-1">
								Refuser
							</Button>
						</div>
					</div>
				</m.div>
			)}
		</AnimatePresence>
	);
}
