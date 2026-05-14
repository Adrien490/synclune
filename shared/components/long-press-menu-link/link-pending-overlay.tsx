"use client";

import { useLinkStatus } from "next/link";

/**
 * Overlay rendu uniquement pendant la navigation (Next.js `useLinkStatus`).
 * Doit être un descendant direct du `<Link>` parent.
 *
 * Réutilisable hors `LongPressMenuLink` (ex: cards orders qui wrap leur propre
 * `<Link>` dans `SwipeableCard` et ne peuvent pas utiliser le composant complet).
 */
export function LinkPendingOverlay() {
	const { pending } = useLinkStatus();
	if (!pending) return null;
	return (
		<span
			aria-hidden="true"
			className="bg-foreground/5 motion-safe:animate-in motion-safe:fade-in pointer-events-none absolute inset-0 rounded-[inherit] [animation-delay:120ms] [animation-fill-mode:backwards] motion-safe:duration-200"
		/>
	);
}
