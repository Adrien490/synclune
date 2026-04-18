"use client";

import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

// Admin link lives in MenuSheetNav's dedicated section for better discoverability.
// Footer stays focused on social + copyright.
interface MenuSheetFooterProps {
	isAdmin?: boolean;
}

export function MenuSheetFooter(_props: MenuSheetFooterProps) {
	return (
		<footer className="relative z-10 shrink-0 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<div className="flex items-center gap-3">
				<a
					href={BRAND.social.instagram.url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-11 items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-95"
					aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
					onClick={() => triggerHaptic("selection")}
				>
					<InstagramIcon decorative size={18} />
				</a>
				<a
					href={BRAND.social.tiktok.url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-11 items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-95"
					aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
					onClick={() => triggerHaptic("selection")}
				>
					<TikTokIcon decorative size={18} />
				</a>
			</div>

			<p className="text-muted-foreground mt-3 text-center text-xs" suppressHydrationWarning>
				© {new Date().getFullYear()} {BRAND.name}
			</p>
		</footer>
	);
}
