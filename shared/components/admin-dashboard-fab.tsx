"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, LayoutDashboard, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useEffect } from "react";
import { toast } from "sonner";
import { maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "@/shared/hooks/use-fab-visibility";
import { FAB_KEYS } from "@/shared/constants/fab";
import Link from "next/link";

interface AdminDashboardFabProps {
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * FAB pour acceder au tableau de bord admin depuis le site public.
 *
 * Visible uniquement pour les admins (verification cote serveur dans le layout).
 * Lien direct vers /admin, masquable par l'utilisateur avec persistance cookie.
 */
export function AdminDashboardFab({
	initialHidden = false,
}: AdminDashboardFabProps) {
	const toggleButtonRef = useRef<HTMLButtonElement>(null);
	const mainLinkRef = useRef<HTMLAnchorElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFirstRender = useRef(true);

	useEffect(() => {
		isFirstRender.current = false;
	}, []);

	useEffect(() => {
		return () => {
			if (statusTimeoutRef.current) {
				clearTimeout(statusTimeoutRef.current);
			}
		};
	}, []);

	const prefersReducedMotion = useReducedMotion();
	const reducedMotion = prefersReducedMotion ?? false;
	const transition = maybeReduceMotion(
		{
			type: "spring",
			stiffness: 500,
			damping: 35,
			mass: 0.3,
		},
		reducedMotion
	);

	const { isHidden, toggle, isPending, isError } = useFabVisibility({
		key: FAB_KEYS.ADMIN_DASHBOARD,
		initialHidden,
		onToggle: (newHiddenState) => {
			if (statusRef.current) {
				statusRef.current.textContent = newHiddenState
					? "Acces tableau de bord masque"
					: "Acces tableau de bord affiche";
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
					mainLinkRef.current?.focus();
				}
			});
		},
	});

	useEffect(() => {
		if (isError) {
			toast.error("Erreur lors de la modification");
		}
	}, [isError]);

	const shouldAnimate = !isFirstRender.current && !reducedMotion;

	return (
		<>
			<div ref={statusRef} role="status" aria-live="polite" className="sr-only" />

			<AnimatePresence mode="wait">
				{isHidden ? (
					<motion.div
						key="fab-hidden"
						initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
						animate={{ opacity: 1, x: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
						transition={transition}
						className="hidden md:block fixed z-45 bottom-6 right-0"
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
									aria-label="Afficher l'acces au tableau de bord"
									aria-expanded={false}
								>
									<ChevronLeft
										className={cn("size-5", isPending && "animate-pulse")}
										aria-hidden="true"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={4}>
								<p className="text-sm">Afficher</p>
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
						className="hidden md:block group fixed z-45 bottom-6 right-6"
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
										"flex",
										"md:opacity-0 md:group-hover:opacity-100",
										"focus-visible:opacity-100",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
										"focus-visible:outline-none",
										"transition-opacity duration-200",
										isPending && "cursor-wait md:opacity-100"
									)}
									aria-label="Masquer l'acces au tableau de bord"
									aria-expanded={true}
								>
									<X
										className={cn("size-4", isPending && "animate-pulse")}
										aria-hidden="true"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={4}>
								<p className="text-xs">Masquer</p>
							</TooltipContent>
						</Tooltip>

						{/* Lien principal vers /admin */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									ref={mainLinkRef}
									href="/admin"
									className={cn(
										"relative rounded-full shadow-lg cursor-pointer",
										"bg-primary hover:bg-primary/90 text-primary-foreground",
										"flex items-center justify-center",
										"size-14",
										"hover:shadow-xl hover:shadow-primary/25",
										"active:scale-95",
										"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										"focus-visible:outline-none",
										"transition-all duration-200"
									)}
									aria-label="Acceder au tableau de bord"
								>
									<LayoutDashboard className="size-6" aria-hidden="true" />
								</Link>
							</TooltipTrigger>
							<TooltipContent side="left" sideOffset={12}>
								<p className="font-medium">Tableau de bord</p>
								<p className="text-xs text-muted-foreground">
									Acceder a l'administration
								</p>
							</TooltipContent>
						</Tooltip>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
