"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, Plus, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, useEffectEvent } from "react";
import { toast } from "sonner";
import { maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "@/shared/hooks/use-fab-visibility";
import type { FabKey } from "@/shared/constants/fab";
import Link from "next/link";

interface SpeedDialTooltipContent {
	/** Titre du tooltip (gras) */
	title: string;
	/** Description optionnelle (sous le titre) */
	description?: string;
}

export interface SpeedDialAction {
	/** Identifiant unique de l'action */
	id: string;
	/** Icône de l'action */
	icon: React.ReactNode;
	/** Label de l'action (affiché dans le tooltip) */
	label: string;
	/** Callback au click (pour actions custom comme dialog) */
	onClick?: () => void;
	/** Lien de navigation (alternatif à onClick) */
	href?: string;
	/** Variante visuelle */
	variant?: "default" | "secondary";
}

export interface SpeedDialFabProps {
	/** Clé du FAB pour la persistance de visibilité */
	fabKey: FabKey;
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Icône principale du FAB (défaut: Plus) */
	mainIcon?: React.ReactNode;
	/** Icône quand ouvert (défaut: X) */
	openIcon?: React.ReactNode;
	/** Contenu du tooltip principal */
	tooltip: SpeedDialTooltipContent;
	/** Actions disponibles dans le speed dial */
	actions: SpeedDialAction[];
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
}

/**
 * Speed Dial FAB - Menu d'actions rapides flottant
 *
 * @example
 * ```tsx
 * <SpeedDialFab
 *   fabKey={FAB_KEYS.ADMIN_SPEED_DIAL}
 *   initialHidden={isHidden}
 *   tooltip={{ title: "Actions rapides" }}
 *   ariaLabel="Ouvrir le menu d'actions rapides"
 *   actions={[
 *     { id: "create", icon: <Plus />, label: "Créer", href: "/admin/create" },
 *     { id: "contact", icon: <Mail />, label: "Contact", onClick: () => setOpen(true) },
 *   ]}
 * />
 * ```
 */
export function SpeedDialFab({
	fabKey,
	initialHidden = false,
	mainIcon,
	openIcon,
	tooltip,
	actions,
	ariaLabel,
	ariaDescription,
	showTooltip = "Afficher",
	hideTooltip = "Masquer",
	hideOnMobile = true,
	className,
}: SpeedDialFabProps) {
	const [isOpen, setIsOpen] = useState(false);
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainButtonRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Cleanup du timeout au démontage
	useEffect(() => {
		return () => {
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
		};
	}, []);

	// Effect Event pour gérer Escape sans re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if (e.key === "Escape" && isOpen) {
			setIsOpen(false);
			mainButtonRef.current?.focus();
		}
	});

	// Fermer le menu avec Escape
	useEffect(() => {
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onKeyDown]);

	// Effect Event pour gérer le click extérieur sans re-registration
	const onClickOutside = useEffectEvent((e: MouseEvent) => {
		if (
			isOpen &&
			containerRef.current &&
			!containerRef.current.contains(e.target as Node)
		) {
			setIsOpen(false);
		}
	});

	// Fermer le menu au click extérieur
	useEffect(() => {
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [onClickOutside]);

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

	// Hook pour toggle la visibilité du FAB
	const { isHidden, toggle, isPending, isError } = useFabVisibility({
		key: fabKey,
		initialHidden,
		onToggle: (newHiddenState) => {
			// Fermer le menu si on cache le FAB
			if (newHiddenState) {
				setIsOpen(false);
			}

			// Annonce pour les lecteurs d'écran
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

	// Gestion du click sur une action
	const handleActionClick = (action: SpeedDialAction) => {
		if (action.onClick) {
			action.onClick();
		}
		setIsOpen(false);
	};

	// Mode caché : affiche juste une flèche pour réouvrir
	if (isHidden) {
		return (
			<>
				<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

				<AnimatePresence mode="wait">
					<motion.div
						key="fab-hidden"
						initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
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
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				<motion.div
					key="fab-visible"
					ref={containerRef}
					data-fab-container
					initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
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
									"md:opacity-0 md:group-hover:opacity-100",
									"focus-visible:opacity-100",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
									"focus-visible:outline-none",
									"transition-all duration-200",
									isPending && "cursor-wait opacity-100"
								)}
								aria-label={hideTooltip}
							>
								<X
									className={cn("size-4", isPending && "animate-pulse")}
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={4}>
							<p className="text-xs">{hideTooltip}</p>
						</TooltipContent>
					</Tooltip>

					{/* Actions du Speed Dial */}
					<AnimatePresence>
						{isOpen && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3"
								role="menu"
								aria-label="Actions rapides"
							>
								{actions.map((action, index) => (
									<motion.div
										key={action.id}
										initial={
											prefersReducedMotion
												? undefined
												: { opacity: 0, y: 20, scale: 0.8 }
										}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={
											prefersReducedMotion
												? undefined
												: { opacity: 0, y: 10, scale: 0.8 }
										}
										transition={{
											...transition,
											delay: prefersReducedMotion ? 0 : index * 0.05,
										}}
										className="flex items-center gap-3"
									>
										{/* Label de l'action */}
										<span className="text-sm font-medium bg-popover text-popover-foreground px-3 py-1.5 rounded-md shadow-md border whitespace-nowrap">
											{action.label}
										</span>

										{/* Bouton de l'action */}
										{action.href ? (
											<Button
												asChild
												size="icon"
												variant={action.variant === "secondary" ? "secondary" : "default"}
												className={cn(
													"size-12 rounded-full shadow-lg",
													"hover:shadow-xl hover:scale-105",
													"active:scale-95",
													"transition-transform duration-200"
												)}
												role="menuitem"
											>
												<Link href={action.href} onClick={() => setIsOpen(false)}>
													{action.icon}
													<span className="sr-only">{action.label}</span>
												</Link>
											</Button>
										) : (
											<Button
												size="icon"
												variant={action.variant === "secondary" ? "secondary" : "default"}
												className={cn(
													"size-12 rounded-full shadow-lg",
													"hover:shadow-xl hover:scale-105",
													"active:scale-95",
													"transition-transform duration-200"
												)}
												onClick={() => handleActionClick(action)}
												role="menuitem"
											>
												{action.icon}
												<span className="sr-only">{action.label}</span>
											</Button>
										)}
									</motion.div>
								))}
							</motion.div>
						)}
					</AnimatePresence>

					{/* Backdrop quand ouvert */}
					<AnimatePresence>
						{isOpen && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="fixed inset-0 bg-background/60 -z-10"
								aria-hidden="true"
								onClick={() => setIsOpen(false)}
							/>
						)}
					</AnimatePresence>

					{/* Bouton principal */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								ref={mainButtonRef}
								onClick={() => setIsOpen(!isOpen)}
								size="lg"
								className={cn(
									"relative rounded-full shadow-lg cursor-pointer",
									"bg-primary hover:bg-primary/90",
									"flex items-center justify-center",
									"size-14 p-0",
									"hover:shadow-xl hover:shadow-primary/25",
									"transition-all duration-200",
									"active:scale-95",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"focus-visible:outline-none",
									className
								)}
								aria-label={ariaLabel}
								aria-expanded={isOpen}
								aria-haspopup="menu"
								aria-describedby={
									ariaDescription ? `fab-description-${fabKey}` : undefined
								}
							>
								<motion.div
									animate={{ rotate: isOpen ? 45 : 0 }}
									transition={{ duration: 0.2 }}
								>
									{isOpen
										? openIcon || <X className="size-6" aria-hidden="true" />
										: mainIcon || <Plus className="size-6" aria-hidden="true" />}
								</motion.div>
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
