"use client";

import { useRegisterOverlay } from "@/shared/hooks/use-register-overlay";

/**
 * Enregistre l'overlay dans l'overlay-stack tant qu'il est monté.
 *
 * À rendre DANS le Portal de l'overlay : il ne monte alors que pendant que la
 * surface est ouverte (Radix comme Vaul ne rendent pas les enfants du Portal
 * quand `open=false`), et le cleanup d'effet tourne à la fermeture — la pile
 * reste cohérente. Sans lui, la bottom-bar admin restait visible et le
 * pull-to-refresh armé sous un dialog Radix.
 *
 * SSOT des 4 familles (Dialog, AlertDialog, Sheet, Drawer) — chacune en avait
 * une copie locale, celle du Drawer sans le paramètre `enabled` (audit UI
 * design system 2026-08-01).
 */
export function OverlayStackRegister({ enabled = true }: { enabled?: boolean }) {
	useRegisterOverlay(enabled);
	return null;
}
