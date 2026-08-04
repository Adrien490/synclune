"use client";

import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { announce } from "@/shared/utils/announce";

type ManageCookiesButtonProps = {
	className?: string;
};

export function ManageCookiesButton({ className }: ManageCookiesButtonProps) {
	const resetConsent = useCookieConsentStore((state) => state.resetConsent);
	const triggerHaptic = useHaptic();

	const handleClick = () => {
		triggerHaptic("light");
		resetConsent();
		// La bannière réapparaît montée AVEC son contenu (AnimatePresence) : elle
		// ne peut pas s'auto-annoncer via aria-live. Annonce impérative via les
		// régions persistantes du toaster (SSOT announce()) — pas de focus
		// programmatique, décision G2/G6 de l'audit 2026-05-19.
		announce(
			"Tes préférences ont été réinitialisées. La bannière de cookies est de nouveau affichée en bas de l'écran.",
		);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label="Modifier mes préférences cookies"
			className={className}
		>
			Modifier mes préférences
		</button>
	);
}
