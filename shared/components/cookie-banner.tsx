"use client";

import {
	useCookieConsentStore,
	useHasConsented,
} from "@/shared/providers/cookie-consent-store-provider";
import { Button } from "./ui/button";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Cookie Banner RGPD conforme - Version simplifiée bas gauche
 *
 * Affiche un petit encart en bas à gauche avec 2 choix simples : accepter ou refuser.
 * Conforme CNIL :
 * - Choix simple et clair
 * - Durée: 13 mois
 *
 * Optimisé pour React 19.2 - hydratation safe sans useState
 */
export function CookieBanner() {
	const bannerVisible = useCookieConsentStore((state) => state.bannerVisible);
	const acceptCookies = useCookieConsentStore((state) => state.acceptCookies);
	const rejectCookies = useCookieConsentStore((state) => state.rejectCookies);
	const _hasHydrated = useCookieConsentStore((state) => state._hasHydrated);
	const hasConsented = useHasConsented();

	// Ne rien afficher tant que le store n'est pas hydraté depuis localStorage
	// Cela évite le flash du banner pendant le chargement
	if (!_hasHydrated) {
		return null;
	}

	// Condition d'affichage : hydraté + pas de consentement + banner visible
	const shouldShow = _hasHydrated && !hasConsented && bannerVisible;

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto z-50 w-auto max-w-[calc(100vw-2rem)] md:max-w-md"
					role="dialog"
					aria-live="polite"
					aria-label="Consentement cookies"
				>
					<div className="bg-background/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-xl p-4 md:p-6 space-y-3 md:space-y-4">
						{/* Header avec icône */}
						<div className="flex items-center gap-2.5">
							<Cookie
								size={20}
								className="shrink-0 text-primary"
								aria-hidden="true"
							/>
							<h2 className="text-base font-semibold text-foreground">
								Cookies
							</h2>
						</div>

						{/* Message */}
						<p className="text-sm text-muted-foreground leading-relaxed">
							Nous utilisons des cookies pour améliorer ton expérience.{" "}
							<Link
								href="/legal/cookies"
								className="text-foreground underline hover:no-underline"
							>
								En savoir plus
							</Link>
							{" • "}
							<Link
								href="/confidentialite"
								className="text-foreground underline hover:no-underline"
							>
								Politique de confidentialité
							</Link>
						</p>

						{/* Boutons d'action - simplifié à 2 choix */}
						<div className="flex gap-2.5 md:gap-2">
							<Button
								onClick={acceptCookies}
								size="sm"
								className="flex-1"
								autoFocus
							>
								Accepter
							</Button>
							<Button
								onClick={rejectCookies}
								variant="outline"
								size="sm"
								className="flex-1"
							>
								Refuser
							</Button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
