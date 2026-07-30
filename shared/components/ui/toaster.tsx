"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { mediaAtLeast } from "@/shared/constants/breakpoints";
import { toastIcons } from "@/shared/components/ui/toast-icons";
import { ANNOUNCE_REGION_IDS } from "@/shared/utils/announce";

/**
 * Toaster responsive avec position et gestes adaptés mobile/desktop.
 *
 * - Desktop (>768px): top-center, swipe horizontal pour dismiss, gap 12px.
 * - Mobile (≤768px): bottom-center, swipe vers le bas (natif iOS/Android), gap 8px.
 *
 * Le safe-area iOS (notch/home indicator) est respecté via `offset` env() et
 * le CSS `[data-sonner-toaster]` dans app/styles/components.css.
 */
export function AppToaster() {
	const isMobile = useIsMobile();
	// Mobile portrait strict : 1 toast (espace vertical contraint, pattern iOS)
	// Desktop / mobile landscape / tablette : stack 3 (pattern macOS/iPadOS)
	const isLandscape = useMediaQuery(`(orientation: landscape) and ${mediaAtLeast("md")}`);
	const visibleToasts = isMobile && !isLandscape ? 1 : 3;

	return (
		<>
			<SonnerToaster
				theme="light"
				position={isMobile ? "bottom-center" : "top-center"}
				visibleToasts={visibleToasts}
				icons={toastIcons}
				closeButton
				swipeDirections={isMobile ? ["bottom"] : ["right", "left"]}
				gap={isMobile ? 8 : 12}
				offset={
					isMobile
						? // `--bottom-bar-height` porte la hauteur MESURÉE de la barre, safe-area
							// incluse : ne jamais la réadditionner, ce serait compter l'encoche deux
							// fois. Le `max(…, env(…))` ne couvre plus que le cas SANS barre
							// (checkout, où la bottom-nav est masquée) — sinon le toast se posait sur
							// l'indicateur d'accueil (audit bottom-bar 2026-07-30).
							"max(calc(var(--bottom-bar-height, 0px) + 1rem), env(safe-area-inset-bottom, 0px))"
						: "max(1rem, env(safe-area-inset-top))"
				}
			/>
			{/*
			 * Régions sr-only pour VoiceOver/TalkBack (WCAG 4.1.3 Status Messages).
			 * Sonner 2.0 n'expose pas `aria-live` sur son conteneur — on double via
			 * ces régions, pilotées par `announce()` (shared/utils/announce.ts).
			 *
			 * ⚠️ Ces deux nœuds sont le SEUL canal d'annonce garanti présent avant
			 * toute interaction (layout racine). `announce()` est un no-op silencieux
			 * s'ils disparaissent : les ids viennent d'une SSOT partagée et
			 * `toaster.regression.test.tsx` verrouille leur présence + leurs attributs.
			 */}
			<div
				id={ANNOUNCE_REGION_IDS.polite}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
			<div
				id={ANNOUNCE_REGION_IDS.assertive}
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			/>
		</>
	);
}
