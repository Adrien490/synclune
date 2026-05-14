"use client";

import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { BRAND } from "@/shared/constants/brand";
import { useHaptic } from "@/shared/hooks/use-haptic";

/**
 * Badge `@synclune.bijoux` en overlay bas-droite de l'image teaser.
 *
 * Cliquable (redondance pointer/touch du CTA principal), mais `aria-hidden` +
 * `tabIndex={-1}` pour ne pas dupliquer le lien pour les lecteurs d'écran ni
 * polluer l'ordre de tabulation — le CTA principal `InstagramFollowButton`
 * reste l'unique entrée accessible.
 */
export function InstagramHandleBadge() {
	const haptic = useHaptic();

	return (
		<a
			href={BRAND.social.instagram.url}
			target="_blank"
			rel="noopener noreferrer"
			tabIndex={-1}
			aria-hidden="true"
			onClick={() => haptic("selection")}
			className="bg-background/95 text-foreground absolute right-4 bottom-4 inline-flex touch-manipulation items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:active:scale-[0.98]"
		>
			<InstagramIcon decorative size={16} />
			{BRAND.social.instagram.handle}
		</a>
	);
}
