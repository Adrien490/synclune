"use client";

import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
	useActionState,
	useEffect,
	useEffectEvent,
	useOptimistic,
	useRef,
	useState,
	useTransition,
} from "react";

import { dismissAnnouncement } from "@/shared/actions/dismiss-announcement";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import {
	ANNOUNCEMENT_VARIANT_CLASSES,
	type AnnouncementVariant,
} from "@/shared/constants/announcement";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { isSafeStorefrontLink } from "@/shared/utils/is-safe-storefront-link";
import { withCallbacks } from "@/shared/utils/with-callbacks";

const SWIPE_DISMISS_THRESHOLD = 30;
const COUNTDOWN_DISPLAY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export interface AnnouncementBarProps {
	message: string;
	link: string | null;
	endsAt: Date | null;
	/** 16-char stable hash of the message — keys the dismiss cookie */
	hash: string;
	/** Tonalité visuelle (promo/info/alerte) — défaut PROMO côté wrapper. */
	variant: AnnouncementVariant;
}

function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function AnnouncementBar({ message, link, endsAt, hash, variant }: AnnouncementBarProps) {
	const prefersReducedMotion = useReducedMotion();
	const barRef = useRef<HTMLDivElement>(null);
	const isDismissingRef = useRef(false);
	// Ne déplacer le focus vers #main-content qu'au dismiss VOLONTAIRE (clic/swipe/Échap),
	// jamais à l'auto-masquage d'expiration (ne pas voler le focus du visiteur).
	const focusMainOnExitRef = useRef(false);

	const [optimisticDismissed, setOptimisticDismissed] = useOptimistic(false);
	const [, startTransition] = useTransition();
	const [, formAction] = useActionState(
		withCallbacks(dismissAnnouncement, {
			onError: () => setOptimisticDismissed(false),
		}),
		undefined,
	);

	// Auto-masquage en temps réel quand `endsAt` est dépassé pendant que l'onglet
	// reste ouvert (≠ dismiss utilisateur : pas de cookie). Les données serveur sont
	// cachées 7j — sans ça la promo expirée resterait visible jusqu'à la prochaine
	// navigation/invalidation. Dérivé directement de `isExpired` (pas de state miroir).
	const { label: countdownLabel, isExpired } = useCountdown(endsAt, COUNTDOWN_DISPLAY_THRESHOLD_MS);
	const hasCountdown = countdownLabel !== null;

	const isVisible = !optimisticDismissed && !isExpired;

	// La valeur initiale de `--announcement-bar-height` est posée côté SERVEUR par
	// AnnouncementBarWrapper (inline <style>) pour éviter tout saut de layout au
	// premier paint (la navbar s'offsette via cette var). Cet effet n'est qu'une
	// garde idempotente côté client (réécrit la même valeur tant que visible).
	useEffect(() => {
		if (isVisible) {
			document.documentElement.style.setProperty(
				"--announcement-bar-height",
				"calc(var(--ab-height) + env(safe-area-inset-top, 0px))",
			);
		}
	}, [isVisible]);

	useEffect(() => {
		return () => {
			if (!isDismissingRef.current) {
				document.documentElement.style.setProperty("--announcement-bar-height", "0px");
			}
		};
	}, []);

	const dismiss = () => {
		isDismissingRef.current = true;
		focusMainOnExitRef.current = true;
		startTransition(() => {
			setOptimisticDismissed(true);
			const fd = new FormData();
			fd.append("hash", hash);
			formAction(fd);
		});
	};

	const onExitComplete = () => {
		document.documentElement.style.setProperty("--announcement-bar-height", "0px");
		if (focusMainOnExitRef.current) {
			document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true });
		}
	};

	const { swipeOffset, isSwiping } = useSwipeToDismiss(barRef, isVisible, dismiss);

	const safeLink = link && isSafeStorefrontLink(link) ? link : null;

	const handleClose = () => {
		triggerHaptic("light");
		dismiss();
	};

	const content = <span className="line-clamp-2 sm:line-clamp-1">{message}</span>;

	// Padding du conteneur texte : réserve l'espace du close button (droite) et,
	// quand un countdown est affiché, l'espace de la pastille (sinon le texte
	// centré multi-lignes passe sous la pastille sur écran étroit — P2).
	const messagePaddingRight = hasCountdown
		? "pr-[max(7rem,env(safe-area-inset-right))]"
		: "pr-[max(2.5rem,env(safe-area-inset-right))]";

	// Respecte prefers-reduced-motion : pas de translation verticale, fondu seul.
	const barVariants = prefersReducedMotion
		? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
		: {
				initial: { y: "-100%", opacity: 0 },
				animate: { y: 0, opacity: 1 },
				exit: { y: "-100%", opacity: 0 },
			};

	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{isVisible && (
				<m.div
					ref={barRef}
					role="region"
					aria-label="Barre d'annonce promotionnelle"
					initial={barVariants.initial}
					animate={barVariants.animate}
					exit={barVariants.exit}
					transition={MOTION_CONFIG.spring.bar}
					style={{
						viewTransitionName: "announcement-bar",
						...(swipeOffset < 0
							? {
									transform: `translateY(${swipeOffset}px)`,
									opacity: Math.max(0, 1 + swipeOffset / SWIPE_DISMISS_THRESHOLD),
									...(!isSwiping && !prefersReducedMotion
										? {
												transition:
													"transform var(--duration-fast) ease-out, opacity var(--duration-fast) ease-out",
											}
										: {}),
								}
							: {}),
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") dismiss();
					}}
					className={cn(
						"fixed inset-x-0 top-0 z-50",
						"h-(--ab-height)",
						"flex items-center justify-center",
						ANNOUNCEMENT_VARIANT_CLASSES[variant],
						"text-sm font-medium tracking-wide",
						"pt-[env(safe-area-inset-top)]",
						"overflow-hidden",
						// Windows High Contrast : le fond est aplati sur Canvas → délimiter le
						// bandeau du contenu par une bordure système.
						"forced-colors:border-b forced-colors:border-b-[CanvasText]",
					)}
				>
					<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden" />
					</div>

					{safeLink ? (
						<Link
							href={safeLink}
							className={cn(
								"relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center",
								"pl-[max(2.5rem,env(safe-area-inset-left))]",
								messagePaddingRight,
								"duration-fast underline underline-offset-2 transition-[text-decoration] hover:no-underline",
							)}
						>
							{content}
						</Link>
					) : (
						<div
							className={cn(
								"relative flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 text-center",
								"pl-[max(2.5rem,env(safe-area-inset-left))]",
								messagePaddingRight,
							)}
						>
							{content}
						</div>
					)}

					{countdownLabel ? (
						<span
							role="timer"
							aria-live="off"
							aria-label={`Offre se termine dans ${countdownLabel}`}
							className={cn(
								"pointer-events-none absolute top-1/2 right-14 hidden -translate-y-1/2 items-center gap-1 rounded-full px-2 py-0.5 sm:right-16",
								"bg-current/15",
								"text-2xs font-mono font-semibold tracking-wider tabular-nums",
								"xs:inline-flex",
							)}
						>
							{countdownLabel}
						</span>
					) : null}

					<button
						type="button"
						onClick={handleClose}
						className="absolute top-1/2 right-2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-current/15 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-hidden motion-safe:active:scale-95 sm:right-3"
						aria-label="Fermer la barre d'annonce"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</m.div>
			)}
		</AnimatePresence>
	);
}

function useSwipeToDismiss(
	elementRef: React.RefObject<HTMLElement | null>,
	enabled: boolean,
	onDismiss: () => void,
) {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isSwiping, setIsSwiping] = useState(false);
	const touchStartYRef = useRef<number | null>(null);
	const swipeOffsetRef = useRef(0);
	// `useEffectEvent` plutôt qu'un latest-ref + effet de sync (cf. commentaire
	// identique dans `use-swipe-to-remove`).
	const emitDismiss = useEffectEvent(() => onDismiss());

	useEffect(() => {
		swipeOffsetRef.current = swipeOffset;
	}, [swipeOffset]);

	useEffect(() => {
		const el = elementRef.current;
		if (!el || !enabled) return;

		function onTouchStart(e: TouchEvent) {
			const touch = e.touches[0];
			if (!touch) return;
			touchStartYRef.current = touch.clientY;
			setIsSwiping(true);
		}

		function onTouchMove(e: TouchEvent) {
			const touch = e.touches[0];
			if (touchStartYRef.current === null || !touch) return;
			const deltaY = touch.clientY - touchStartYRef.current;
			setSwipeOffset(Math.min(0, deltaY));
		}

		function onTouchEnd() {
			if (touchStartYRef.current === null) return;
			touchStartYRef.current = null;
			setIsSwiping(false);
			if (swipeOffsetRef.current < -SWIPE_DISMISS_THRESHOLD) {
				triggerHaptic("medium");
				emitDismiss();
			}
			setSwipeOffset(0);
		}

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: true });
		el.addEventListener("touchend", onTouchEnd, { passive: true });
		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
		};
	}, [elementRef, enabled]);

	return { swipeOffset, isSwiping };
}

interface Countdown {
	/** Label HH:MM:SS / MM:SS quand on est dans la fenêtre d'affichage, sinon null. */
	label: string | null;
	/** `true` une fois `target` dépassé (target défini) — déclenche l'auto-masquage. */
	isExpired: boolean;
}

/**
 * Compte à rebours efficace : ne re-rend chaque seconde QUE dans la fenêtre
 * `thresholdMs` avant l'échéance. Hors fenêtre (échéance lointaine), un timeout
 * unique réveille le hook quand on entre dans la fenêtre — pas de churn 1/s
 * pendant des heures. `isExpired` permet au bandeau de disparaître en temps réel
 * à l'échéance (le gate serveur `endsAt` est caché 7j → sinon promo expirée stale).
 */
function useCountdown(target: Date | null, thresholdMs: number): Countdown {
	const targetMs = target ? target.getTime() : null;
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		if (targetMs === null) return;
		let intervalId = 0;
		let timeoutId = 0;
		const update = () => setNow(Date.now());

		const schedule = () => {
			const remaining = targetMs - Date.now();
			update();
			if (remaining <= 0) return; // expiré : plus rien à planifier
			if (remaining > thresholdMs) {
				// Échéance lointaine : un seul réveil à l'entrée de fenêtre.
				timeoutId = window.setTimeout(schedule, remaining - thresholdMs + 50);
			} else {
				// Fenêtre d'affichage : tick chaque seconde jusqu'à l'échéance.
				intervalId = window.setInterval(() => {
					update();
					if (Date.now() >= targetMs) window.clearInterval(intervalId);
				}, 1000);
			}
		};
		schedule();

		return () => {
			window.clearInterval(intervalId);
			window.clearTimeout(timeoutId);
		};
	}, [targetMs, thresholdMs]);

	if (targetMs === null || now === null) return { label: null, isExpired: false };
	const remaining = targetMs - now;
	if (remaining <= 0) return { label: null, isExpired: true };
	const label = remaining <= thresholdMs ? formatRemaining(remaining) : null;
	return { label, isExpired: false };
}
