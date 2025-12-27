"use client";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";
import { Button } from "./ui/button";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
 * - Focus trap pour dialog modal
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
	const acceptButtonRef = useRef<HTMLButtonElement>(null);

	// Condition d'affichage : hydraté + pas de consentement + banner visible
	const shouldShow = _hasHydrated && !hasConsented && bannerVisible;

	// Focus sur le bouton Accepter après animation
	useEffect(() => {
		if (shouldShow && acceptButtonRef.current && !shouldReduceMotion) {
			const timer = setTimeout(() => {
				acceptButtonRef.current?.focus();
			}, 300);
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
				<motion.div
					initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
					transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
					className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 md:bottom-6 md:left-6 md:right-auto z-50 w-auto max-w-[calc(100vw-2rem)] md:max-w-md"
					role="dialog"
					aria-modal="true"
					aria-label="Consentement cookies"
					aria-describedby="cookie-description"
				>
					<FocusScope trapped loop>
						<div className="bg-background/95 backdrop-blur-md border border-primary/15 shadow-lg rounded-xl p-4 md:p-6 space-y-3 md:space-y-4">
							{/* Header avec icône */}
							<div className="flex items-center gap-2.5">
								<Cookie
									size={20}
									className="shrink-0 text-primary"
									aria-hidden="true"
								/>
								<p className="text-base font-semibold text-foreground">
									Cookies
								</p>
							</div>

							{/* Message */}
							<p id="cookie-description" className="text-sm text-muted-foreground leading-relaxed">
								Nous utilisons des cookies pour améliorer ton expérience.
								<span className="sr-only">
									{" "}Votre choix sera mémorisé pendant 6 mois conformément aux recommandations CNIL.
								</span>
							</p>

							{/* Liens */}
							<div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
								<Link
									href="/cookies"
									className="text-foreground underline hover:no-underline py-1"
								>
									En savoir plus
								</Link>
								<Link
									href="/confidentialite"
									className="text-foreground underline hover:no-underline py-1"
								>
									Politique de confidentialité
								</Link>
							</div>

							{/* Boutons d'action - différenciés mais CNIL-compliant */}
							<div className="flex gap-2">
								<Button
									ref={acceptButtonRef}
									onClick={acceptCookies}
									variant="default"
									size="sm"
									className="flex-1 min-h-11"
								>
									Accepter
								</Button>
								<Button
									onClick={rejectCookies}
									variant="secondary"
									size="sm"
									className="flex-1 min-h-11"
								>
									Refuser
								</Button>
							</div>
						</div>
					</FocusScope>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
