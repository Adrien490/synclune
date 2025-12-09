"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { useFabVisibility } from "../hooks/use-fab-visibility";
import type { FabKey } from "../constants";

/** Transition spring par défaut */
const SPRING_TRANSITION = {
	type: "spring" as const,
	stiffness: 400,
	damping: 25,
};

/** Transition réduite pour prefers-reduced-motion */
const REDUCED_TRANSITION = { duration: 0 };

interface FabTooltipContent {
	/** Titre du tooltip (gras) */
	title: string;
	/** Description optionnelle (sous le titre) */
	description?: string;
}

export interface FabProps {
	/** Clé du FAB pour la persistance de visibilité */
	fabKey: FabKey;
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Icône à afficher dans le FAB */
	icon: React.ReactNode;
	/** Contenu du tooltip principal */
	tooltip: FabTooltipContent;
	/** Contenu optionnel à afficher à côté du FAB */
	children?: React.ReactNode;
	/** Label accessible pour le bouton principal */
	ariaLabel: string;
	/** Description accessible (sr-only) */
	ariaDescription?: string;
	/** Tooltip pour le bouton "afficher" (mode caché) */
	showTooltip?: string;
	/** Tooltip pour le bouton "masquer" */
	hideTooltip?: string;
	/** Masquer sur mobile (défaut: true) */
	hideOnMobile?: boolean;
	/** Classes CSS additionnelles pour le bouton principal */
	className?: string;
	/** Callback appelé au click sur le bouton principal */
	onClick?: () => void;
}

/**
 * Floating Action Button générique avec système de visibilité
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <Fab
 *   fabKey={FAB_KEYS.CONTACT_ADRIEN}
 *   initialHidden={isHidden}
 *   icon={<MessageSquare className="h-6 w-6" />}
 *   tooltip={{ title: "Contacter" }}
 *   ariaLabel="Ouvrir le formulaire de contact"
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

	// Respecter prefers-reduced-motion
	const prefersReducedMotion = useReducedMotion();
	const transition = prefersReducedMotion ? REDUCED_TRANSITION : SPRING_TRANSITION;

	// Hook pour toggle la visibilité
	const { isHidden, toggle, isPending } = useFabVisibility({
		key: fabKey,
		initialHidden,
		onToggle: (newHiddenState) => {
			requestAnimationFrame(() => {
				if (newHiddenState) {
					toggleButtonRef.current?.focus();
				} else {
					mainButtonRef.current?.focus();
				}
			});
		},
	});

	// Classes de base pour la visibilité mobile
	const visibilityClass = hideOnMobile ? "hidden md:block" : "block";

	// Mode caché : affiche juste une flèche pour réouvrir
	if (isHidden) {
		return (
			<AnimatePresence>
				<motion.div
					initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					transition={transition}
					className={cn(visibilityClass, "fixed z-40 bottom-6 right-1")}
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								ref={toggleButtonRef}
								onClick={toggle}
								variant="outline"
								size="sm"
								className={cn(
									"rounded-l-full rounded-r-none",
									"h-10 w-10 p-0",
									"bg-background",
									"border-r-0",
									"shadow-md",
									"cursor-pointer",
									"hover:bg-accent",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"focus-visible:outline-none"
								)}
								aria-label={showTooltip}
								aria-expanded={false}
							>
								<ChevronLeft
									className={cn("h-4 w-4", isPending && "animate-pulse")}
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="left" sideOffset={4}>
							<p className="text-sm">{showTooltip}</p>
						</TooltipContent>
					</Tooltip>
				</motion.div>
			</AnimatePresence>
		);
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
				transition={transition}
				className={cn(visibilityClass, "group fixed z-40 bottom-6 right-6")}
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
								"h-7 w-7 rounded-full",
								"bg-muted",
								"border border-border",
								"shadow-sm",
								"cursor-pointer",
								"hover:bg-accent",
								"opacity-60 hover:opacity-100",
								"focus-visible:opacity-100",
								"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
								"focus-visible:outline-none"
							)}
							aria-label={hideTooltip}
							aria-expanded={true}
						>
							<ChevronRight
								className={cn("h-3.5 w-3.5", isPending && "animate-pulse")}
								aria-hidden="true"
							/>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={4}>
						<p className="text-xs">{hideTooltip}</p>
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
								"h-14 w-14 p-0",
								"hover:shadow-xl hover:shadow-primary/25",
								"transition-transform duration-200 hover:scale-105",
								"active:scale-95",
								"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"focus-visible:outline-none",
								className
							)}
							aria-label={ariaLabel}
							aria-describedby={ariaDescription ? `fab-description-${fabKey}` : undefined}
						>
							{icon}
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
		</AnimatePresence>
	);
}
