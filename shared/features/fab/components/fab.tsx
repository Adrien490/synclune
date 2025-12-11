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
import { toast } from "sonner";
import { maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "../hooks/use-fab-visibility";
import type { FabKey } from "../constants";

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
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
	const transition = maybeReduceMotion(
		{
			type: "spring",
			stiffness: 400,
			damping: 30,
			mass: 0.5,
		},
		prefersReducedMotion ?? false
	);

	// Hook pour toggle la visibilité
	const { isHidden, toggle, isPending, isError } = useFabVisibility({
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

	// Feedback utilisateur en cas d'erreur
	useEffect(() => {
		if (isError) {
			toast.error("Erreur lors de la modification");
		}
	}, [isError]);

	// Classes de base pour la visibilité mobile
	const visibilityClass = hideOnMobile ? "hidden md:block" : "block";

	// Mode caché : affiche juste une flèche pour réouvrir
	if (isHidden) {
		return (
			<>
				{/* Région aria-live pour annonces screen reader */}
				<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

				<AnimatePresence mode="wait">
					<motion.div
						key="fab-hidden"
						initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
						transition={transition}
						className={cn(visibilityClass, "fixed z-40 bottom-6 right-0")}
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
				</AnimatePresence>
			</>
		);
	}

	return (
		<>
			{/* Région aria-live pour annonces screen reader */}
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				<motion.div
					key="fab-visible"
					data-fab-container
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
									"size-7 rounded-full",
									"bg-muted",
									"border border-border",
									"shadow-sm",
									"hover:bg-accent",
									"opacity-0 group-hover:opacity-100",
									"focus-visible:opacity-100",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
									"focus-visible:outline-none",
									"transition-opacity duration-200",
									isPending && "cursor-wait opacity-100"
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
									"transition-transform duration-200 hover:scale-105",
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
		</>
	);
}
