"use client";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";
import { Button } from "./ui/button";
import Link from "next/link";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { useEffect, useRef } from "react";

/**
 * Cookie Banner RGPD conforme - Version simplifiée bas gauche
 *
 * Affiche un petit encart en bas à gauche avec 2 choix simples : accepter ou refuser.
 * Conforme CNIL :
 * - Choix simple et clair
 * - Boutons différenciés mais équitables (pas de dark pattern)
 * - Durée: 6 mois
 *
 * Accessibilité :
 * - Support prefers-reduced-motion
 * - Touch targets 44px minimum sur mobile (WCAG 2.5.5)
 * - Safe area iOS pour iPhone avec barre de navigation
 * - Focus trap
 * - Attributs ARIA complets
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
	const bannerRef = useRef<HTMLDivElement>(null);

	// Condition d'affichage : hydraté + pas de consentement + banner visible
	const shouldShow = _hasHydrated && !hasConsented && bannerVisible;

	// Focus on the banner container (neutral element) — CNIL compliant: no bias toward Accept
	useEffect(() => {
		if (shouldShow && bannerRef.current) {
			const timer = setTimeout(
				() => {
					bannerRef.current?.focus();
				},
				shouldReduceMotion ? 0 : 300,
			);
			return () => clearTimeout(timer);
		}
	}, [shouldShow, shouldReduceMotion]);

	// Gestion touche Escape pour refuser les cookies
	useEffect(() => {
		if (!shouldShow) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				rejectCookies();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [shouldShow, rejectCookies]);

	// Ne rien afficher tant que le store n'est pas hydraté depuis localStorage
	// Cela évite le flash du banner pendant le chargement
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
					className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 w-auto max-w-[calc(100vw-2rem)] md:right-auto md:bottom-6 md:left-6 md:max-w-md"
					role="alertdialog"
					aria-modal="true"
					aria-label="Consentement cookies"
					aria-describedby="cookie-description"
				>
					<FocusScope trapped loop>
						<div
							ref={bannerRef}
							tabIndex={-1}
							className="bg-background/95 border-primary/15 space-y-3 rounded-xl border p-4 shadow-lg backdrop-blur-md focus:outline-none md:space-y-4 md:p-6"
						>
							<p className="text-foreground text-base font-semibold">Cookies</p>

							{/* Message */}
							<p id="cookie-description" className="text-muted-foreground text-sm leading-relaxed">
								Nous utilisons des cookies optionnels à des fins de statistiques de navigation pour
								améliorer votre expérience.
								<span className="sr-only">
									{" "}
									Votre choix sera mémorisé pendant 6 mois conformément aux recommandations CNIL.
								</span>
							</p>

							{/* Liens */}
							<div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
								<Link
									href="/cookies"
									className="text-foreground focus-visible:ring-ring/50 py-1 underline outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-2"
									aria-label="En savoir plus sur les cookies"
								>
									En savoir plus
								</Link>
								<Link
									href="/confidentialite"
									className="text-foreground focus-visible:ring-ring/50 py-1 underline outline-none hover:no-underline focus-visible:rounded-sm focus-visible:ring-2"
								>
									Politique de confidentialité
								</Link>
							</div>

							{/* Boutons d'action - différenciés mais CNIL-compliant */}
							<div className="flex gap-2">
								<Button
									onClick={acceptCookies}
									variant="default"
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
					</FocusScope>
				</m.div>
			)}
		</AnimatePresence>
	);
}
