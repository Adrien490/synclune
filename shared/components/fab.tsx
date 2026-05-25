"use client";

import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
	useActionState,
	useEffect,
	useEffectEvent,
	useOptimistic,
	useRef,
	useState,
	useTransition,
	type ReactNode,
} from "react";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { setFabVisibility } from "@/shared/actions/set-fab-visibility";
import type { FabProps } from "@/shared/types/fab.types";
import { toast } from "@/shared/utils/toast";
import { withCallbacks } from "@/shared/utils/with-callbacks";

// Shared classes for the main FAB button (used by both href and onClick variants).
// Rendered with variant="primary" (no shadow logic) so these own the shadow/scale.
// Focus ring comes from the Button base `focus-ring` utility (DS SSOT) — not redeclared.
// `can-hover:` guards `hover:` against iOS Safari/Chrome sticky-hover on tap.
const mainButtonClassName = cn(
	"group/fab relative rounded-full shadow-lg",
	"size-14 p-0",
	"before:pointer-events-none before:absolute before:inset-0 before:rounded-full",
	"before:bg-primary/35 before:blur-xl before:opacity-0 before:scale-90 before:-z-10",
	"can-hover:hover:before:opacity-100 can-hover:hover:before:scale-110",
	"focus-visible:before:opacity-100 focus-visible:before:scale-110",
	"can-hover:hover:shadow-primary/30 can-hover:hover:shadow-2xl",
	"motion-safe:can-hover:hover:scale-[1.06] motion-safe:active:scale-[0.94]",
	"motion-safe:transition-[transform,color,box-shadow,background-color] motion-safe:duration-200",
	"motion-safe:before:transition-[opacity,transform] motion-safe:before:duration-300",
	"motion-safe:ease-[cubic-bezier(0.34,1.2,0.64,1)]",
);

const iconWrapperClassName = cn(
	"inline-flex motion-safe:transition-transform motion-safe:duration-300",
	"motion-safe:can-hover:group-hover/fab:rotate-[6deg]",
);

/**
 * Conditional Tooltip wrapper.
 * Skips Radix Tooltip on mobile (< 768px) where focus-tap triggers a 150ms flash
 * and blocks scroll subtly. Renders children directly when disabled.
 */
function TooltipMaybe({
	enabled,
	content,
	side,
	sideOffset,
	children,
}: {
	enabled: boolean;
	content: ReactNode;
	side: "top" | "right" | "bottom" | "left";
	sideOffset?: number;
	children: ReactNode;
}) {
	if (!enabled) return <>{children}</>;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side} sideOffset={sideOffset}>
				{content}
			</TooltipContent>
		</Tooltip>
	);
}

/**
 * Floating Action Button générique avec système de visibilité
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Fab
 *   fabKey={FAB_KEYS.ADMIN_DASHBOARD}
 *   initialHidden={isHidden}
 *   icon={<Plus className="size-6" />}
 *   tooltip={{ title: "Actions rapides" }}
 *   ariaLabel="Ouvrir le menu d'actions rapides"
 *   onClick={() => setOpen(true)}
 * />
 *
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogContent>...</DialogContent>
 * </Dialog>
 * ```
 */
export function Fab({
	fabKey,
	initialHidden = false,
	icon,
	badge,
	tooltip,
	children,
	ariaLabel,
	ariaDescription,
	showTooltip = "Afficher",
	hideTooltip = "Masquer",
	hideOnMobile = true,
	className,
	containerClassName,
	ariaHasPopup,
	href,
	onClick,
}: FabProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// "toggle" | "main" — set on toggle, consumed by the callback ref when the target
	// button mounts. Survives the AnimatePresence mode="wait" exit-animation delay.
	const pendingFocusRef = useRef<"toggle" | "main" | null>(null);
	const [hasMounted, setHasMounted] = useState(false);

	// Stable IDs for aria-controls relationship
	const visibleId = `fab-visible-${fabKey}`;
	const hiddenId = `fab-hidden-${fabKey}`;

	// Marquer que le premier rendu est passé
	useEffect(() => {
		queueMicrotask(() => setHasMounted(true));
	}, []);

	// Cleanup du timeout au démontage
	useEffect(() => {
		return () => {
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
		};
	}, []);

	// Respecter prefers-reduced-motion avec config globale
	const prefersReducedMotion = useReducedMotion();
	const reducedMotion = prefersReducedMotion ?? false;
	const transition = maybeReduceMotion(MOTION_CONFIG.spring.snappy, reducedMotion);

	// Skip Radix Tooltip on mobile to avoid focus-tap flash (150ms delay + blocks scroll)
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Haptic feedback (no-op on iOS Safari, respects prefers-reduced-motion)
	const haptic = useHaptic();

	// Visibility toggle with optimistic UI + server action rollback
	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticHidden, setOptimisticHidden] = useOptimistic(initialHidden);
	const [, formAction, isActionPending] = useActionState(
		withCallbacks(setFabVisibility, {
			onError: () => {
				setOptimisticHidden(initialHidden);
				toast.error("Erreur lors de la modification");
			},
		}),
		undefined,
	);

	const isHidden = optimisticHidden;
	const isPending = isTransitionPending || isActionPending;

	function onToggle(newHiddenState: boolean) {
		// SR announcement via ref (no re-render)
		if (statusRef.current) {
			statusRef.current.textContent = newHiddenState
				? `${tooltip.title} masqué`
				: `${tooltip.title} affiché`;
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
			statusTimeoutRef.current = setTimeout(() => {
				if (statusRef.current) statusRef.current.textContent = "";
			}, 1000);
		}

		// Defer focus to the callback ref. With AnimatePresence mode="wait" the target
		// branch mounts only after the exiting branch's exit animation completes —
		// long after a single requestAnimationFrame, so a ref read here would be null.
		pendingFocusRef.current = newHiddenState ? "toggle" : "main";
	}

	function toggle() {
		const newHiddenState = !optimisticHidden;

		// Fire onToggle immediately for instant SR announcements and focus management.
		// Guarded so a consumer throw cannot poison the transition / prevent rollback.
		try {
			onToggle(newHiddenState);
		} catch {
			// Callback failure must not abort the optimistic update below.
		}

		startTransition(() => {
			setOptimisticHidden(newHiddenState);
			const formData = new FormData();
			formData.append("key", fabKey);
			formData.append("isHidden", newHiddenState.toString());
			formAction(formData);
		});
	}

	// Effect Event: reads isPending and toggle without re-attaching the listener
	const onEscapeKey = useEffectEvent((e: KeyboardEvent) => {
		if (
			e.key === "Escape" &&
			!isPending &&
			e.target instanceof Node &&
			containerRef.current?.contains(e.target)
		) {
			toggle();
		}
	});

	// Handler ESC pour masquer le FAB (scoped au container)
	useEffect(() => {
		if (isHidden) return;

		document.addEventListener("keydown", onEscapeKey);
		return () => document.removeEventListener("keydown", onEscapeKey);
	}, [isHidden]);

	// Classes de base pour la visibilité mobile
	const visibilityClass = hideOnMobile ? "hidden md:block" : "block";

	// Déterminer si on doit animer (pas au premier rendu)
	const shouldAnimate = hasMounted && !reducedMotion;

	const handleHideToggle = () => {
		haptic("selection");
		toggle();
	};

	const handleMainClick = () => {
		haptic("light");
		onClick?.();
	};

	const handleMainHrefClick = () => {
		haptic("light");
	};

	// Callback refs: focus the node exactly when it attaches to the DOM. Needed because
	// AnimatePresence mode="wait" mounts the entering branch only after the exiting
	// branch's exit animation finishes. pendingFocusRef gates this so plain mounts
	// (initial page load, unrelated re-renders) never steal focus.
	const hiddenButtonRef = (node: HTMLButtonElement | null) => {
		if (node && pendingFocusRef.current === "toggle") {
			pendingFocusRef.current = null;
			node.focus();
		}
	};

	const mainButtonCallbackRef = (node: HTMLButtonElement | null) => {
		if (node && pendingFocusRef.current === "main") {
			pendingFocusRef.current = null;
			node.focus();
		}
	};

	return (
		<>
			{/* Région aria-live pour annonces screen reader */}
			<div
				ref={statusRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>

			<AnimatePresence mode="wait">
				{isHidden ? (
					<m.div
						key="fab-hidden"
						id={hiddenId}
						initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
						transition={transition}
						className={cn(
							visibilityClass,
							"fixed right-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-45",
							containerClassName,
						)}
					>
						<TooltipMaybe
							enabled={isDesktop}
							side="left"
							sideOffset={4}
							content={<p className="text-sm">{showTooltip}</p>}
						>
							<Button
								ref={hiddenButtonRef}
								onClick={handleHideToggle}
								disabled={isPending}
								variant="outline"
								size="sm"
								className={cn(
									"rounded-l-full rounded-r-none",
									"size-9 p-0",
									"bg-background",
									"border-r-0",
									"shadow-sm",
									"opacity-40 hover:opacity-100 focus-visible:opacity-100",
									"hover:bg-accent",
									"motion-safe:transition-[transform,opacity,background-color] motion-safe:duration-150",
									"active:scale-95",
									isPending && "opacity-70",
								)}
								aria-label={showTooltip}
								aria-pressed={true}
							>
								<ChevronLeft
									className={cn("size-4", isPending && "animate-pulse")}
									aria-hidden="true"
								/>
							</Button>
						</TooltipMaybe>
					</m.div>
				) : (
					<m.div
						key="fab-visible"
						id={visibleId}
						ref={containerRef}
						data-fab-container
						initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
						transition={transition}
						className={cn(
							visibilityClass,
							"group fixed right-[max(1.5rem,env(safe-area-inset-right,0px))] bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-45",
							containerClassName,
						)}
					>
						{/* Bouton pour cacher le FAB */}
						<TooltipMaybe
							enabled={isDesktop}
							side="top"
							sideOffset={4}
							content={
								<>
									<p className="text-xs">{hideTooltip}</p>
									<p className="text-muted-foreground text-xs">Échap</p>
								</>
							}
						>
							<Button
								onClick={handleHideToggle}
								disabled={isPending}
								variant="ghost"
								size="icon"
								className={cn(
									"absolute -top-2 -right-2 z-10",
									"size-6 rounded-full",
									// 44x44 hit area (WCAG 2.5.5 Level AAA / Apple HIG)
									"after:absolute after:inset-[-10px] after:content-['']",
									"bg-muted",
									"border-border border",
									"shadow-sm",
									"hover:bg-accent",
									"active:scale-95",
									"md:opacity-0 md:group-hover:opacity-100",
									"focus-visible:opacity-100",
									"motion-safe:duration-normal motion-safe:transition-[transform,opacity,background-color]",
									isPending && "md:opacity-100",
								)}
								aria-label={hideTooltip}
								aria-pressed={false}
							>
								<X className={cn("size-4", isPending && "animate-pulse")} aria-hidden="true" />
							</Button>
						</TooltipMaybe>

						{/* Bouton principal avec tooltip */}
						<TooltipMaybe
							enabled={isDesktop}
							side="left"
							sideOffset={12}
							content={
								<>
									<p className="font-medium">{tooltip.title}</p>
									{tooltip.description && (
										<p className="text-muted-foreground text-xs">{tooltip.description}</p>
									)}
								</>
							}
						>
							{href ? (
								<Button
									ref={mainButtonCallbackRef}
									asChild
									variant="primary"
									size="lg"
									className={cn(mainButtonClassName, className)}
								>
									<a
										href={href}
										onClick={handleMainHrefClick}
										aria-label={ariaLabel}
										aria-haspopup={ariaHasPopup}
										aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
									>
										<span className={iconWrapperClassName}>{icon}</span>
										{badge && (
											<div className="pointer-events-none absolute -top-1.5 -left-1.5">{badge}</div>
										)}
									</a>
								</Button>
							) : (
								<Button
									ref={mainButtonCallbackRef}
									onClick={handleMainClick}
									variant="primary"
									size="lg"
									className={cn(mainButtonClassName, className)}
									aria-label={ariaLabel}
									aria-haspopup={ariaHasPopup}
									aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
								>
									<span className={iconWrapperClassName}>{icon}</span>
									{badge && (
										<div className="pointer-events-none absolute -top-1.5 -left-1.5">{badge}</div>
									)}
								</Button>
							)}
						</TooltipMaybe>

						{/* Contenu (dialog, popover, etc.) */}
						{children}

						{/* Description cachée pour screen readers */}
						{ariaDescription && (
							<span id={`fab-description-${fabKey}`} className="sr-only">
								{ariaDescription}
							</span>
						)}
					</m.div>
				)}
			</AnimatePresence>
		</>
	);
}
