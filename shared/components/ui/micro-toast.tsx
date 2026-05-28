"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useAnimationControls, useReducedMotion } from "motion/react";

import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { toastIcons } from "@/shared/components/ui/toast-icons";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useMicroToastStore } from "@/shared/stores/micro-toast-store";
import { cn } from "@/shared/utils/cn";

/**
 * Mini-pastille flottante top-center pour feedback success/info/warning/error/
 * wishlist/cart/discount mobile (feedback unifié — les erreurs y sont incluses, F1).
 *
 * Mountée par `<AppToaster />`. Pilotée par `useMicroToastStore` (single-slot,
 * remplace OU coalesce ×N si même message rapide). La couleur du variant est
 * portée par l'icône (`toastIcons`) pour rester cohérent avec la pillule
 * rounded-2xl (un border-l-2 dessinerait un arc maladroit).
 *
 * Rendu via `createPortal(document.body)` (pattern Radix/Sonner) pour échapper
 * à tout stacking context ancêtre (ex: `SidebarInset` admin avec transform).
 * Sans portal, un ancêtre avec `transform`/`filter`/`isolation: isolate` re-base
 * `position: fixed` et peut masquer la pastille malgré `z-index: 200`.
 *
 * Position : `top: max(0.5rem, env(safe-area-inset-top))`, left 50%, translateX(-50%).
 * Animation : spring 380/28 (preset `MOTION_CONFIG.spring.toast`) sur entrée
 * (slide-down + scale 0.96→1) et sortie (y:-8, opacity:0). Reduced-motion : instantané.
 *
 * Gestes :
 *   - Tap = `hide()` immédiat (parité swipe Sonner mobile). Désactivé sur la
 *     variante avec action (F5) : la fermeture passe par le bouton « × » dédié
 *     pour ne pas annuler par mégarde une action « Annuler » disponible.
 *   - Swipe-up (motion drag) = `hide()` si offset.y < -40 ou velocity.y < -300.
 *     `dragMomentum={false}` pour ne pas continuer après lâcher.
 *
 * Action inline (F5 — undo mobile) : si `store.action` est défini, la pastille
 * rend un `m.div` conteneur (HTML valide, pas de bouton imbriqué) avec un bouton
 * d'action (« Annuler ») + un bouton « × ». Sinon, comportement passif historique
 * (`m.button` tap-to-dismiss).
 *
 * Progress bar :
 *   - 1px linéaire bottom, animée via `useAnimationControls()` (scaleX 1→0).
 *   - Restart à chaque `key` (nouveau toast) ET à chaque `count` (coalesce ×N).
 *   - Reduced-motion : pas de progress bar (le compte ×N reste visible).
 *
 * A11y :
 *   - Single source of truth : régions sr-only `#toast-live-polite` /
 *     `#toast-live-assertive` du toaster, pilotées par `shared/utils/toast.ts`.
 *     Les erreurs (F1) y sont annoncées en `assertive` AVANT le routage pastille.
 *   - La pastille passive est un `<button>` (tap/swipe-to-dismiss) ; la variante
 *     avec action est un `role="group"`. Dans les deux cas l'`aria-label` reprend
 *     le message visible pour rester intelligible si l'AT n'a pas entendu la live
 *     region (bug VoiceOver iOS sur live region nouvellement montée).
 */
export function MicroToast() {
	const visible = useMicroToastStore((state) => state.visible);
	const message = useMicroToastStore((state) => state.message);
	const variant = useMicroToastStore((state) => state.variant);
	const key = useMicroToastStore((state) => state.key);
	const count = useMicroToastStore((state) => state.count);
	const currentDuration = useMicroToastStore((state) => state.currentDuration);
	const action = useMicroToastStore((state) => state.action);
	const hide = useMicroToastStore((state) => state.hide);
	const prefersReducedMotion = useReducedMotion();
	const progressControls = useAnimationControls();
	const mounted = useMounted();

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

	// aria-label = contenu en premier (la pastille EST la notification, le tap-to-close
	// est secondaire). Le rôle button + cursor-pointer + describedby suffit à signaler
	// l'action de fermeture. Le canal principal d'annonce reste la live-region globale
	// `#toast-live-polite` ; cet aria-label est le fallback iOS VoiceOver documenté plus haut.
	const accessibleLabel = count > 1 ? `${message} (×${count})` : message;

	const baseClassName = cn(
		"fixed left-1/2 z-(--z-microtoast) -translate-x-1/2",
		"top-[max(0.5rem,env(safe-area-inset-top))]",
		"flex max-w-[90vw] items-center gap-2",
		"rounded-2xl border px-4 py-2",
		"bg-background/85 border-border/40 shadow-sm backdrop-blur-md",
		"text-foreground text-sm font-medium",
		"relative overflow-hidden",
	);

	const countBadge = count > 1 && (
		<span
			className="text-muted-foreground bg-muted ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
			aria-hidden="true"
		>
			×{count}
		</span>
	);

	const progressBar = !prefersReducedMotion && (
		<m.span
			key={`progress-${key}-${count}`}
			aria-hidden="true"
			initial={{ scaleX: 1 }}
			animate={progressControls}
			className="bg-foreground/60 absolute right-0 bottom-0 left-0 h-0.5 origin-left rounded-full"
		/>
	);

	if (!mounted) return null;

	return createPortal(
		<>
			<span id="micro-toast-hint" className="sr-only">
				Notification — appuyer pour fermer
			</span>
			<AnimatePresence initial={false}>
				{visible &&
					(action ? (
						// Variante avec action inline (F5 — undo mobile). HTML valide : `m.div`
						// conteneur + boutons internes (pas de bouton imbriqué). Tap message =
						// no-op (lecture), fermeture via le bouton « × » ou swipe-up.
						<m.div
							key={key}
							role="group"
							aria-label={accessibleLabel}
							{...motionProps}
							{...dragProps}
							className={cn(baseClassName, "pr-2")}
						>
							<span className="shrink-0">{toastIcons[variant]}</span>
							<span className="line-clamp-2 flex-1 text-left">{message}</span>
							{countBadge}
							<button
								type="button"
								onClick={() => {
									action.onClick();
									hide();
								}}
								className={cn(
									"text-primary shrink-0 rounded-lg px-3 text-sm font-semibold",
									"hover:bg-muted/60 can-hover:hover:bg-muted/60 min-h-11",
									"focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
								)}
							>
								{action.label}
							</button>
							<button
								type="button"
								onClick={hide}
								aria-label="Fermer la notification"
								aria-describedby="micro-toast-hint"
								className={cn(
									"text-muted-foreground hover:text-foreground grid size-11 shrink-0 place-items-center rounded-lg",
									"focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
								)}
							>
								<svg
									viewBox="0 0 24 24"
									className="size-3.5"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									aria-hidden="true"
								>
									<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
								</svg>
							</button>
							{progressBar}
						</m.div>
					) : (
						<m.button
							key={key}
							type="button"
							onClick={hide}
							aria-label={accessibleLabel}
							aria-describedby="micro-toast-hint"
							{...motionProps}
							{...dragProps}
							className={cn(baseClassName, "cursor-pointer")}
						>
							<span className="shrink-0">{toastIcons[variant]}</span>
							<span className="line-clamp-2 text-left">{message}</span>
							{countBadge}
							{progressBar}
						</m.button>
					))}
			</AnimatePresence>
		</>,
		document.body,
	);
}
