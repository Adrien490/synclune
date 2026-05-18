"use client";

import { useEffect } from "react";
import { AnimatePresence, m, useAnimationControls, useReducedMotion } from "motion/react";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { toastIcons } from "@/shared/components/ui/toast-icons";
import { useMicroToastStore } from "@/shared/stores/micro-toast-store";
import { cn } from "@/shared/utils/cn";

/**
 * Mini-pastille flottante top-center pour feedback success/info/warning/wishlist/
 * cart/discount mobile.
 *
 * Mountée par `<AppToaster />`. Pilotée par `useMicroToastStore` (single-slot,
 * remplace OU coalesce ×N si même message rapide). La couleur du variant est
 * portée par l'icône (`toastIcons`) pour rester cohérent avec la pillule
 * rounded-full (un border-l-2 dessinerait un arc maladroit).
 *
 * Position : `top: max(0.5rem, env(safe-area-inset-top))`, left 50%, translateX(-50%).
 * Animation : spring 380/28 (preset `MOTION_CONFIG.spring.toast`) sur entrée
 * (slide-down + scale 0.96→1) et sortie (y:-8, opacity:0). Reduced-motion : instantané.
 *
 * Gestes :
 *   - Tap = `hide()` immédiat (parité swipe Sonner mobile).
 *   - Swipe-up (motion drag) = `hide()` si offset.y < -40 ou velocity.y < -300.
 *     `dragMomentum={false}` pour ne pas continuer après lâcher.
 *
 * Progress bar :
 *   - 1px linéaire bottom, animée via `useAnimationControls()` (scaleX 1→0).
 *   - Restart à chaque `key` (nouveau toast) ET à chaque `count` (coalesce ×N).
 *   - Reduced-motion : pas de progress bar (le compte ×N reste visible).
 *
 * A11y :
 *   - Single source of truth : régions sr-only `#toast-live-polite` /
 *     `#toast-live-assertive` du toaster, pilotées par `shared/utils/toast.ts`.
 *   - La pastille elle-même est un `<button>` (tap/swipe-to-dismiss). Son
 *     `aria-label` reprend le message visible pour rester intelligible si l'AT
 *     n'a pas entendu la live region (bug VoiceOver iOS sur live region
 *     nouvellement montée). Compromis acceptable : les errors restent sur
 *     Sonner avec persistance 5s, donc aucune info critique ne dépend de la
 *     pastille.
 */
export function MicroToast() {
	const visible = useMicroToastStore((state) => state.visible);
	const message = useMicroToastStore((state) => state.message);
	const variant = useMicroToastStore((state) => state.variant);
	const key = useMicroToastStore((state) => state.key);
	const count = useMicroToastStore((state) => state.count);
	const currentDuration = useMicroToastStore((state) => state.currentDuration);
	const hide = useMicroToastStore((state) => state.hide);
	const prefersReducedMotion = useReducedMotion();
	const progressControls = useAnimationControls();

	useEffect(() => {
		if (!visible || prefersReducedMotion) return;
		progressControls.set({ scaleX: 1 });
		void progressControls.start({
			scaleX: 0,
			transition: { duration: currentDuration / 1000, ease: "linear" },
		});
	}, [visible, key, count, currentDuration, prefersReducedMotion, progressControls]);

	const motionProps = prefersReducedMotion
		? {}
		: {
				initial: { y: -16, opacity: 0, scale: 0.96 },
				animate: { y: 0, opacity: 1, scale: 1 },
				exit: { y: -8, opacity: 0 },
				transition: MOTION_CONFIG.spring.toast,
			};

	const dragProps = prefersReducedMotion
		? {}
		: {
				drag: "y" as const,
				dragConstraints: { top: -200, bottom: 0 },
				dragElastic: { top: 0.4, bottom: 0 },
				dragMomentum: false,
				onDragEnd: (
					_: PointerEvent | MouseEvent | TouchEvent,
					info: { offset: { y: number }; velocity: { y: number } },
				) => {
					if (info.offset.y < -40 || info.velocity.y < -300) hide();
				},
				style: { touchAction: "none" as const },
			};

	const accessibleLabel =
		count > 1
			? `Fermer la notification : ${message} (×${count})`
			: `Fermer la notification : ${message}`;

	return (
		<AnimatePresence initial={false}>
			{visible && (
				<m.button
					key={key}
					type="button"
					onClick={hide}
					aria-label={accessibleLabel}
					{...motionProps}
					{...dragProps}
					className={cn(
						"fixed left-1/2 z-(--z-microtoast) -translate-x-1/2",
						"top-[max(0.5rem,env(safe-area-inset-top))]",
						"flex max-w-[80vw] cursor-pointer items-center gap-2",
						"rounded-full border px-4 py-2",
						"bg-background/85 border-border/40 shadow-sm backdrop-blur-md",
						"text-foreground text-sm font-medium",
						"focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
						"relative overflow-hidden",
					)}
				>
					<span className="shrink-0">{toastIcons[variant]}</span>
					<span className="truncate">{message}</span>
					{count > 1 && (
						<span
							className="text-muted-foreground bg-muted ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
							aria-hidden="true"
						>
							×{count}
						</span>
					)}
					{!prefersReducedMotion && (
						<m.span
							key={`progress-${key}-${count}`}
							aria-hidden="true"
							initial={{ scaleX: 1 }}
							animate={progressControls}
							className="bg-foreground/25 absolute right-0 bottom-0 left-0 h-px origin-left rounded-full"
						/>
					)}
				</m.button>
			)}
		</AnimatePresence>
	);
}
