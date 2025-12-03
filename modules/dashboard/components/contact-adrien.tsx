"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { useToggleContactAdrienVisibility } from "../hooks/use-toggle-contact-adrien-visibility";
import { ContactAdrienForm } from "./contact-adrien-form";

interface ContactAdrienProps {
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/** Transition spring par défaut */
const SPRING_TRANSITION = { type: "spring" as const, stiffness: 400, damping: 25 };

/** Transition réduite pour prefers-reduced-motion */
const REDUCED_TRANSITION = { duration: 0 };

/**
 * Floating Action Button pour contacter Adri (Desktop uniquement)
 *
 * Features:
 * - Dialog intégré avec formulaire de feedback
 * - Collapse/Expand avec persistance cookie
 * - Accessible avec aria-label et tooltip
 *
 * Note: Sur mobile, le bouton est masqué et le formulaire
 * est accessible via le drawer de la bottom-navigation.
 */
export function ContactAdrien({ initialHidden = false }: ContactAdrienProps) {
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainButtonRef = useRef<HTMLButtonElement>(null);

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

	// Mode caché : affiche juste une flèche pour réouvrir (desktop only)
	if (isHidden) {
		return (
			<AnimatePresence>
				<motion.div
					initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					transition={transition}
					className="hidden md:block fixed z-40 bottom-6 right-0"
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
									"h-10 w-8 p-0",
									"bg-background",
									"border-r-0",
									"shadow-md",
									"cursor-pointer",
									"hover:bg-accent",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									"focus-visible:outline-none"
								)}
								aria-label="Afficher le bouton de contact"
								aria-expanded={false}
							>
								<ChevronLeft
									className={cn("h-4 w-4", isPending && "animate-pulse")}
									aria-hidden="true"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="left" sideOffset={4}>
							<p className="text-sm">Afficher Contacter Adri</p>
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
				className="hidden md:block group fixed z-40 bottom-6 right-6"
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
								"opacity-0 group-hover:opacity-100",
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
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

					<DialogContent className="sm:max-w-[525px]">
						<DialogHeader>
							<DialogTitle>Contacter Adri</DialogTitle>
							<DialogDescription>
								Signale un bug, demande une nouvelle fonctionnalité ou pose une
								question.
							</DialogDescription>
						</DialogHeader>

						<ContactAdrienForm
							onSuccess={() => setDialogOpen(false)}
							onCancel={() => setDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>

				{/* Description cachée pour screen readers */}
				<span id="fab-description" className="sr-only">
					Ouvre un formulaire pour envoyer un message à Adri, poser une question,
					faire une suggestion ou signaler un problème.
				</span>
			</motion.div>
		</AnimatePresence>
	);
}
