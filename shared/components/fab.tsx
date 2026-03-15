"use client";

import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useRef, useState, useEffect, useEffectEvent } from "react";
import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "@/shared/hooks/use-fab-visibility";
import type { FabProps } from "@/shared/types/fab.types";

// Shared classes for the main FAB button (used by both href and onClick variants)
const mainButtonClassName = cn(
	"relative cursor-pointer rounded-full shadow-lg",
	"bg-primary hover:bg-primary/90",
	"flex items-center justify-center",
	"size-14 p-0",
	"hover:shadow-primary/25 hover:shadow-xl",
	"active:scale-95",
	"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
	"focus-visible:outline-none",
);

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
 *   icon={<Plus className="h-6 w-6" />}
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
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainButtonRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

	// Hook pour toggle la visibilité
	const { isHidden, toggle, isPending } = useFabVisibility({
		key: fabKey,
		initialHidden,
		onToggle: (newHiddenState) => {
			// Annonce pour les lecteurs d'écran avec contexte (via ref, pas de re-render)
			if (statusRef.current) {
				statusRef.current.textContent = newHiddenState
					? `${tooltip.title} masqué`
					: `${tooltip.title} affiché`;
				// Nettoyer le timeout précédent si existant
				if (statusTimeoutRef.current) {
					clearTimeout(statusTimeoutRef.current);
				}
				// Nettoyer après l'annonce
				statusTimeoutRef.current = setTimeout(() => {
					if (statusRef.current) statusRef.current.textContent = "";
				}, 1000);
			}

			requestAnimationFrame(() => {
				if (newHiddenState) {
					toggleButtonRef.current?.focus();
				} else {
					mainButtonRef.current?.focus();
				}
			});
		},
	});

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

	return (
		<>
			{/* Région aria-live pour annonces screen reader */}
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				{isHidden ? (
					<m.div
						key="fab-hidden"
						id={hiddenId}
						initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
						transition={transition}
						className={cn(visibilityClass, "fixed right-0 bottom-6 z-45", containerClassName)}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									ref={toggleButtonRef}
									onClick={toggle}
									disabled={isPending}
									variant="outline"
									size="sm"
									className={cn(
										"rounded-l-full rounded-r-none",
										"size-9 p-0",
										"bg-background",
										"border-r-0",
										"shadow-sm",
										"opacity-40 hover:opacity-100",
										"hover:bg-accent",
										"transition-all active:scale-95",
										"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
										"focus-visible:outline-none",
										isPending && "cursor-wait opacity-70",
									)}
									aria-label={showTooltip}
									aria-expanded={false}
									aria-controls={visibleId}
								>
									<ChevronLeft
										className={cn("size-4", isPending && "animate-pulse")}
										aria-hidden="true"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={4}>
								<p className="text-sm">{showTooltip}</p>
							</TooltipContent>
						</Tooltip>
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
						className={cn(visibilityClass, "group fixed right-6 bottom-6 z-45", containerClassName)}
					>
						{/* Bouton pour cacher le FAB */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									onClick={toggle}
									disabled={isPending}
									variant="ghost"
									size="icon"
									className={cn(
										"absolute -top-2 -right-2 z-10",
										"size-6 rounded-full",
										"after:absolute after:inset-[-8px] after:content-['']",
										"bg-muted",
										"border-border border",
										"shadow-sm",
										"hover:bg-accent",
										"active:scale-95",
										"flex",
										"md:opacity-0 md:group-hover:opacity-100",
										"focus-visible:opacity-100",
										"focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
										"focus-visible:outline-none",
										"motion-safe:duration-normal motion-safe:transition-[opacity,background-color]",
										isPending && "cursor-wait md:opacity-100",
									)}
									aria-label={hideTooltip}
									aria-expanded={true}
									aria-controls={hiddenId}
								>
									<X className={cn("size-4", isPending && "animate-pulse")} aria-hidden="true" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={4}>
								<p className="text-xs">{hideTooltip}</p>
								<p className="text-muted-foreground text-xs">Échap</p>
							</TooltipContent>
						</Tooltip>

						{/* Bouton principal avec tooltip */}
						<Tooltip>
							<TooltipTrigger asChild>
								{href ? (
									<Button
										ref={mainButtonRef}
										asChild
										size="lg"
										className={cn(mainButtonClassName, className)}
									>
										<a
											href={href}
											aria-label={ariaLabel}
											aria-haspopup={ariaHasPopup}
											aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
										>
											{icon}
											{badge && (
												<div className="pointer-events-none absolute -top-1.5 -right-1.5">
													{badge}
												</div>
											)}
										</a>
									</Button>
								) : (
									<Button
										ref={mainButtonRef}
										onClick={onClick}
										size="lg"
										className={cn(mainButtonClassName, className)}
										aria-label={ariaLabel}
										aria-haspopup={ariaHasPopup}
										aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
									>
										{icon}
										{badge && (
											<div className="pointer-events-none absolute -top-1.5 -right-1.5">
												{badge}
											</div>
										)}
									</Button>
								)}
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={12}>
								<p className="font-medium">{tooltip.title}</p>
								{tooltip.description && (
									<p className="text-muted-foreground text-xs">{tooltip.description}</p>
								)}
							</TooltipContent>
						</Tooltip>

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
