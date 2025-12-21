"use client";

import { cn } from "@/shared/utils/cn";
import { LayoutDashboard, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { useFabVisibility } from "@/shared/hooks/use-fab-visibility";
import { FAB_KEYS } from "@/shared/constants/fab";
import Link from "next/link";

interface AdminBarProps {
	/** Etat initial de visibilite (depuis le cookie serveur) */
	initialHidden?: boolean;
}

/**
 * Barre d'administration fixe en haut du site public.
 *
 * Visible uniquement pour les admins (verification cote serveur dans le layout).
 * Pattern WordPress-like, non-intrusif, masquable avec persistance cookie.
 */
export function AdminBar({ initialHidden = false }: AdminBarProps) {
	const isFirstRender = useRef(true);

	useEffect(() => {
		isFirstRender.current = false;
	}, []);

	const prefersReducedMotion = useReducedMotion();
	const reducedMotion = prefersReducedMotion ?? false;
	const transition = maybeReduceMotion(
		{
			type: "spring",
			stiffness: 400,
			damping: 30,
			mass: 0.5,
		},
		reducedMotion
	);

	const { isHidden, toggle, isPending, isError } = useFabVisibility({
		key: FAB_KEYS.ADMIN_DASHBOARD,
		initialHidden,
	});

	useEffect(() => {
		if (isError) {
			toast.error("Erreur lors de la modification");
		}
	}, [isError]);

	const shouldAnimate = !isFirstRender.current && !reducedMotion;

	return (
		<>
			{/* Spacer pour compenser la hauteur de l'admin bar */}
			<AnimatePresence mode="wait">
				{!isHidden && (
					<motion.div
						key="admin-bar-spacer"
						initial={shouldAnimate ? { height: 0 } : { height: 40 }}
						animate={{ height: 40 }}
						exit={{ height: 0 }}
						transition={transition}
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			{/* Barre fixe */}
			<AnimatePresence mode="wait">
				{!isHidden && (
					<motion.div
						key="admin-bar"
						initial={shouldAnimate ? { opacity: 0, y: -40 } : false}
						animate={{ opacity: 1, y: 0 }}
						exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -40 }}
						transition={transition}
						className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 text-zinc-100 text-sm"
						role="banner"
						aria-label="Barre d'administration"
					>
						<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
							<div className="flex h-10 items-center justify-between gap-4">
								{/* Indicateur mode admin */}
								<div className="flex items-center gap-2 text-zinc-400">
									<div className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
									<span className="hidden sm:inline">Mode admin</span>
								</div>

								{/* Actions */}
								<div className="flex items-center gap-1">
									<Link
										href="/admin"
										className={cn(
											"inline-flex items-center gap-2 px-3 py-1.5 rounded-md",
											"text-zinc-100 hover:bg-zinc-800",
											"transition-colors duration-200",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
										)}
									>
										<LayoutDashboard className="size-4" aria-hidden="true" />
										<span>Tableau de bord</span>
									</Link>

									{/* Bouton fermer */}
									<button
										type="button"
										onClick={toggle}
										disabled={isPending}
										className={cn(
											"inline-flex items-center justify-center size-8 rounded-md",
											"text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
											"transition-colors duration-200",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
											isPending && "cursor-wait opacity-50"
										)}
										aria-label="Masquer la barre d'administration"
									>
										<X className={cn("size-4", isPending && "animate-pulse")} aria-hidden="true" />
									</button>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
