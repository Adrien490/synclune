"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useEffect } from "react";
import {
	MOTION_CONFIG,
	maybeReduceMotion,
} from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "@/shared/hooks/use-fab-visibility";
import type { FabProps } from "@/shared/types/fab.types";

export type { FabProps, FabTooltipContent } from "@/shared/types/fab.types";

/**
 * Floating Action Button générique avec système de visibilité
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Fab
 *   fabKey={FAB_KEYS.ADMIN_SPEED_DIAL}
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
	onClick,
}: FabProps) {
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainButtonRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFirstRender = useRef(true);

	// Marquer que le premier rendu est passé
	useEffect(() => {
		isFirstRender.current = false;
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
	const transition = maybeReduceMotion(
		MOTION_CONFIG.easing.springSnappy,
		reducedMotion
	);

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

	// Handler ESC pour masquer le FAB
	useEffect(() => {
		if (isHidden) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isPending) {
				toggle();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isHidden, isPending, toggle]);

	// Classes de base pour la visibilité mobile
	const visibilityClass = hideOnMobile ? "hidden md:block" : "block";

	// Déterminer si on doit animer (pas au premier rendu)
	const shouldAnimate = !isFirstRender.current && !reducedMotion;

	return (
		<>
			{/* Région aria-live pour annonces screen reader */}
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				{isHidden ? (
					<motion.div
						key="fab-hidden"
						initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
						transition={transition}
						className={cn(visibilityClass, "fixed z-45 bottom-6 right-0")}
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
										"size-12 p-0",
										"bg-background",
										"border-r-0",
										"shadow-md",
										"hover:bg-accent",
										"active:scale-95 transition-transform",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										"focus-visible:outline-none",
										isPending && "cursor-wait opacity-70"
									)}
									aria-label={showTooltip}
									aria-expanded={false}
								>
									<ChevronLeft
										className={cn("size-5", isPending && "animate-pulse")}
										aria-hidden="true"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={4}>
								<p className="text-sm">{showTooltip}</p>
							</TooltipContent>
						</Tooltip>
					</motion.div>
				) : (
					<motion.div
						key="fab-visible"
						data-fab-container
						initial={shouldAnimate ? { opacity: 0, x: 20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
						transition={transition}
						className={cn(visibilityClass, "group fixed z-45 bottom-6 right-6")}
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
										"size-7 rounded-full",
										"bg-muted",
										"border border-border",
										"shadow-sm",
										"hover:bg-accent",
										"active:scale-95",
										"flex",
										"md:opacity-0 md:group-hover:opacity-100",
										"focus-visible:opacity-100",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
										"focus-visible:outline-none",
										"transition-all duration-200",
										isPending && "cursor-wait md:opacity-100"
									)}
									aria-label={hideTooltip}
									aria-expanded={true}
								>
									<X
										className={cn("size-4", isPending && "animate-pulse")}
										aria-hidden="true"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={4}>
								<p className="text-xs">{hideTooltip}</p>
								<p className="text-xs text-muted-foreground">Échap</p>
							</TooltipContent>
						</Tooltip>

						{/* Bouton principal avec tooltip */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									ref={mainButtonRef}
									onClick={onClick}
									size="lg"
									className={cn(
										"relative rounded-full shadow-lg cursor-pointer",
										"bg-primary hover:bg-primary/90",
										"flex items-center justify-center",
										"size-14 p-0",
										"hover:shadow-xl hover:shadow-primary/25",
										"active:scale-95",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										"focus-visible:outline-none",
										className
									)}
									aria-label={ariaLabel}
									aria-haspopup="dialog"
									aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
								>
									{icon}
									{badge && (
										<div className="absolute -top-1 -right-1 pointer-events-none">
											{badge}
										</div>
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={12}>
								<p className="font-medium">{tooltip.title}</p>
								{tooltip.description && (
									<p className="text-xs text-muted-foreground">
										{tooltip.description}
									</p>
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
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
