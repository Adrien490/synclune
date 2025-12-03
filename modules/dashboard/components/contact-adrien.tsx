"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
	ResponsiveDialogTrigger,
} from "@/shared/components/ui/responsive-dialog";
import { FieldGroup, FieldSet } from "@/shared/components/ui/field";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useContactAdrienForm } from "@/modules/dashboard/hooks/use-contact-adrien-form";
import { ActionStatus } from "@/shared/types/server-action";
import { cn } from "@/shared/utils/cn";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToggleContactAdrienVisibility } from "../hooks/use-toggle-contact-adrien-visibility";
import { CONTACT_TYPE_OPTIONS } from "../constants/contact-adrien.constants";

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
			<AnimatePresence>
				<motion.div
					initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
					transition={transition}
					className={cn(
						"fixed z-40",
						"bottom-20 right-0",
						"md:bottom-6 md:right-0"
					)}
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
				<ResponsiveDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
					<Tooltip>
						<TooltipTrigger asChild>
							<ResponsiveDialogTrigger asChild>
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
							</ResponsiveDialogTrigger>
						</TooltipTrigger>
						<TooltipContent side="left" sideOffset={12}>
							<p className="font-medium">Contacter Adri</p>
							<p className="text-xs text-muted-foreground">
								Tu peux me contacter ici Lélé 😁
							</p>
						</TooltipContent>
					</Tooltip>

					<ResponsiveDialogContent className="sm:max-w-[525px]">
						<ResponsiveDialogHeader className="shrink-0">
							<ResponsiveDialogTitle>Contacter Adri</ResponsiveDialogTitle>
							<ResponsiveDialogDescription>
								Signale un bug, demande une nouvelle fonctionnalité ou pose une
								question.
							</ResponsiveDialogDescription>
						</ResponsiveDialogHeader>

						<form
							action={action}
							className="space-y-4 overflow-y-auto flex-1 px-1"
							onSubmit={() => form.handleSubmit()}
						>
							{state?.status === ActionStatus.SUCCESS && state.message && (
								<Alert>
									<CheckCircle2 />
									<AlertDescription>
										<p className="font-medium text-primary">Message envoyé</p>
										<p className="text-sm text-primary/90 mt-1">{state.message}</p>
									</AlertDescription>
								</Alert>
							)}

							{state?.status !== ActionStatus.SUCCESS &&
								state?.status !== ActionStatus.INITIAL &&
								state?.message && (
									<Alert variant="destructive">
										<AlertCircle />
										<AlertDescription>
											<p className="font-medium">Erreur</p>
											<p className="text-sm mt-1">{state.message}</p>
										</AlertDescription>
									</Alert>
								)}

							<FieldSet>
								<FieldGroup>
									<form.AppField
										name="type"
										validators={{
											onChange: ({ value }: { value: string }) => {
												if (!value) return "Le type est requis";
												return undefined;
											},
										}}
									>
										{(field) => (
											<field.SelectField
												label="Type de message"
												options={CONTACT_TYPE_OPTIONS}
												disabled={isFormPending || state?.status === ActionStatus.SUCCESS}
												required
											/>
										)}
									</form.AppField>

									<form.AppField
										name="message"
										validators={{
											onChange: ({ value }: { value: string }) => {
												if (!value) return "Le message est requis";
												if (value.length < 10)
													return "Le message doit contenir au moins 10 caractères";
												if (value.length > 5000)
													return "Le message ne doit pas dépasser 5000 caractères";
												return undefined;
											},
											onBlur: ({ value }) => {
												if (!value) return "Le message est requis";
												if (value.length < 10)
													return "Le message doit contenir au moins 10 caractères";
												if (value.length > 5000)
													return "Le message ne doit pas dépasser 5000 caractères";
												return undefined;
											},
										}}
									>
										{(field) => (
											<div className="space-y-1">
												<field.TextareaField
													label="Message"
													placeholder="Décrivez votre demande en détail..."
													disabled={isFormPending || state?.status === ActionStatus.SUCCESS}
													rows={6}
													className={cn(
														"resize-none transition-opacity",
														isFormPending && "opacity-60"
													)}
													aria-describedby="message-counter"
													required
												/>
												<p
													id="message-counter"
													className="text-xs text-muted-foreground"
													aria-live="polite"
												>
													{field.state.value.length} / 5000 caractères
												</p>
											</div>
										)}
									</form.AppField>
								</FieldGroup>
							</FieldSet>

							<form.Subscribe selector={(formState) => [formState.canSubmit]}>
								{([canSubmit]) => (
									<ResponsiveDialogFooter>
										<ResponsiveDialogTrigger asChild>
											<Button
												type="button"
												variant="outline"
												disabled={isFormPending || state?.status === ActionStatus.SUCCESS}
											>
												Annuler
											</Button>
										</ResponsiveDialogTrigger>
										<Button
											type="submit"
											disabled={
												!canSubmit || isFormPending || state?.status === ActionStatus.SUCCESS
											}
											aria-busy={isFormPending}
										>
											{isFormPending
												? "Envoi..."
												: state?.status === ActionStatus.SUCCESS
													? "Envoyé"
													: "Envoyer"}
										</Button>
									</ResponsiveDialogFooter>
								)}
							</form.Subscribe>
						</form>
					</ResponsiveDialogContent>
				</ResponsiveDialog>

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
