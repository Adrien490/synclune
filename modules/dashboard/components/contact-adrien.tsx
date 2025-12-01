"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useContactAdrienForm } from "@/modules/dashboard/hooks/use-contact-adrien-form";
import { ActionStatus } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, MessageSquare } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToggleContactAdrienVisibility } from "../hooks/use-toggle-contact-adrien-visibility";
import { ContactAdrienHiddenToggle } from "./contact-adrien-hidden-toggle";
import { ContactAdrienDialogForm } from "./contact-adrien-dialog-form";

interface ContactAdrienProps {
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/** Transition spring par défaut */
const SPRING_TRANSITION = { type: "spring" as const, stiffness: 400, damping: 25 };

/** Transition réduite pour prefers-reduced-motion */
const REDUCED_TRANSITION = { duration: 0 };

/**
 * Floating Action Button pour contacter Adri
 *
 * Features:
 * - Dialog intégré avec formulaire de feedback
 * - Collapse/Expand avec persistance cookie
 * - Accessible avec aria-label et tooltip
 *
 * Positionnement:
 * - Desktop: bottom-6 right-6
 * - Mobile: bottom-20 right-4 (au-dessus de la BottomNavigation)
 */
export function ContactAdrien({ initialHidden = false }: ContactAdrienProps) {
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainButtonRef = useRef<HTMLButtonElement>(null);

	// Refs pour les timeouts (évite les memory leaks et race conditions)
	const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cleanup des timeouts au démontage
	useEffect(() => {
		return () => {
			if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
			if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
		};
	}, []);

	// Respecter prefers-reduced-motion
	const prefersReducedMotion = useReducedMotion();
	const transition = prefersReducedMotion ? REDUCED_TRANSITION : SPRING_TRANSITION;

	// Hook pour toggle la visibilité (pattern établi avec useOptimistic intégré)
	const { isHidden, toggle, isPending } = useToggleContactAdrienVisibility({
		initialHidden,
		onToggle: (newHiddenState) => {
			// Gérer le focus après le toggle
			requestAnimationFrame(() => {
				if (newHiddenState) {
					toggleButtonRef.current?.focus();
				} else {
					mainButtonRef.current?.focus();
				}
			});
		},
	});

	// Dialog contrôlé pour auto-fermeture après succès
	const [dialogOpen, setDialogOpen] = useState(false);

	// Contact form hook avec callback pour fermer le dialog après succès
	const { form, action, isPending: isFormPending, state } = useContactAdrienForm({
		onSuccess: () => {
			// Annuler tout timeout précédent
			if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
			// Auto-ferme le dialog 2s après succès (le reset se fait dans onOpenChange)
			autoCloseTimeoutRef.current = setTimeout(() => setDialogOpen(false), 2000);
		},
	});

	// Gestion du changement d'état du dialog avec reset différé pour éviter les race conditions
	const handleDialogOpenChange = useCallback(
		(open: boolean) => {
			setDialogOpen(open);
			if (!open) {
				// Annuler les timeouts précédents
				if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
				if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
				// Délai pour laisser l'animation de fermeture se terminer
				resetTimeoutRef.current = setTimeout(() => {
					if (!isFormPending) {
						form.reset();
					}
				}, 300);
			}
		},
		[form, isFormPending]
	);

	// Mode caché : affiche juste une flèche pour réouvrir
	if (isHidden) {
		return (
			<ContactAdrienHiddenToggle
				ref={toggleButtonRef}
				toggle={toggle}
				isPending={isPending}
				prefersReducedMotion={prefersReducedMotion}
				transition={transition}
			/>
		);
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
				transition={transition}
				className={cn(
					"group",
					"fixed z-40",
					"bottom-20 right-4",
					"md:bottom-6 md:right-6"
				)}
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
								"h-6 w-6 rounded-full",
								"bg-muted",
								"border border-border",
								"shadow-sm",
								"cursor-pointer",
								"hover:bg-accent",
								"opacity-70",
								"md:opacity-0 md:group-hover:opacity-100",
								"focus-visible:opacity-100",
								"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
								"focus-visible:outline-none"
							)}
							aria-label="Masquer le bouton de contact"
							aria-expanded={true}
						>
							<ChevronRight
								className={cn("h-3 w-3", isPending && "animate-pulse")}
								aria-hidden="true"
							/>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={4}>
						<p className="text-xs">Masquer</p>
					</TooltipContent>
				</Tooltip>

				{/* Dialog avec formulaire de contact */}
				<Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
					<Tooltip>
						<TooltipTrigger asChild>
							<DialogTrigger asChild>
								<Button
									ref={mainButtonRef}
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
										"focus-visible:outline-none"
									)}
									aria-label="Contacter Adri - Envoyer un message ou signaler un problème"
									aria-describedby="fab-description"
								>
									<MessageSquare className="h-6 w-6" aria-hidden="true" />
								</Button>
							</DialogTrigger>
						</TooltipTrigger>
						<TooltipContent side="left" sideOffset={12}>
							<p className="font-medium">Contacter Adri</p>
							<p className="text-xs text-muted-foreground">
								Tu peux me contacter ici Lélé 😁
							</p>
						</TooltipContent>
					</Tooltip>

					<ContactAdrienDialogForm
						form={form}
						action={action}
						isPending={isFormPending}
						state={state}
					/>
				</Dialog>

				{/* Description cachée pour screen readers */}
				<span id="fab-description" className="sr-only">
					Ouvre un formulaire pour envoyer un message à Adri, poser une question,
					faire une suggestion ou signaler un problème.
				</span>

				{/* Annonce pour lecteurs d'écran lors de la fermeture automatique */}
				<div aria-live="polite" className="sr-only">
					{state?.status === ActionStatus.SUCCESS &&
						"Message envoyé avec succès. La fenêtre se fermera automatiquement."}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
