"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, ExternalLink, LogOut, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutAlertDialog } from "@/modules/auth/components/logout-alert-dialog";
import {
	getBottomNavPrimaryItems,
	getBottomNavSecondaryItems,
	type NavItem,
} from "./navigation-config";
import { isRouteActive } from "@/shared/lib/navigation";

// Recuperer les items depuis la configuration centralisee
const primaryItems = getBottomNavPrimaryItems();
// Exclure les alertes stock du menu secondaire
const secondaryItems = getBottomNavSecondaryItems().filter(
	(item) => item.id !== "stock-alerts"
);

// Styles partages pour les items de navigation
const sharedItemStyles = {
	focusRing:
		"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
	transition: "motion-safe:transition-all motion-safe:active:scale-95",
	layout: "flex flex-col items-center justify-center rounded-lg relative",
} as const;

const navItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		"gap-1 px-3 py-2 min-w-[64px] min-h-[48px]"
	),
	active: "text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
} as const;

const panelItemStyles = {
	base: cn(
		sharedItemStyles.layout,
		sharedItemStyles.transition,
		sharedItemStyles.focusRing,
		"gap-0.5 py-2 px-1.5 min-h-[60px] rounded-xl",
		// Reset pour que les boutons s'alignent comme les liens
		"border-0 bg-transparent appearance-none cursor-pointer"
	),
	active: "bg-accent/50 text-foreground font-semibold",
	inactive:
		"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30 font-medium",
	destructive:
		"text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20 font-medium",
} as const;

// Animation variants
const containerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.04,
			delayChildren: 0.1,
		},
	},
};

const itemVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
	},
};

interface BottomNavigationProps {
	className?: string;
}

/**
 * Bottom Navigation pour mobile
 * Visible uniquement sur ecrans < 768px (md breakpoint)
 * Position fixed en bas de l'ecran avec backdrop-blur
 */
export function BottomNavigation({ className }: BottomNavigationProps) {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const shouldReduceMotion = useReducedMotion();

	// Verifie si une page du menu "Plus" est active
	const isMoreItemActive = secondaryItems.some((item) => isRouteActive(pathname, item.url));

	const closePanel = useCallback(() => setIsOpen(false), []);
	const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

	// Fermer le panneau quand on change de page (back button navigateur)
	useEffect(() => {
		closePanel();
	}, [pathname, closePanel]);

	// Fermeture avec Escape
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closePanel();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, closePanel]);

	// Bloquer le scroll du body quand le panneau est ouvert
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	return (
		<>
			{/* Backdrop */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
						onClick={closePanel}
						className="md:hidden fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			{/* Panneau anime */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={
							shouldReduceMotion
								? { opacity: 1 }
								: { y: "100%", opacity: 0.5 }
						}
						animate={{ y: 0, opacity: 1 }}
						exit={
							shouldReduceMotion
								? { opacity: 1 }
								: { y: "100%", opacity: 0 }
						}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: {
										type: "spring",
										damping: 28,
										stiffness: 350,
									}
						}
						className="md:hidden fixed bottom-4 left-4 right-4 z-[71] bg-background rounded-2xl border shadow-2xl max-h-[80vh] overflow-y-auto overscroll-contain"
						role="dialog"
						aria-modal="true"
						aria-label="Menu de navigation"
					>
						{/* Grille de navigation avec stagger - 4 colonnes */}
						<motion.div
							variants={shouldReduceMotion ? undefined : containerVariants}
							initial="hidden"
							animate="visible"
							className="grid grid-cols-4 gap-1 p-3 pb-1.5"
						>
							{secondaryItems.map((item) => (
								<PanelNavItem
									key={item.id}
									item={item}
									isActive={isRouteActive(pathname, item.url)}
									onClick={closePanel}
									shouldReduceMotion={shouldReduceMotion ?? false}
								/>
							))}

							{/* Deconnexion */}
							<motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
								<LogoutAlertDialog>
									<button
										type="button"
										className={cn(
											panelItemStyles.base,
											panelItemStyles.destructive,
											"w-full"
										)}
									>
										<LogOut className="size-5 shrink-0" aria-hidden="true" />
										<span className="text-[10px] text-center leading-tight tracking-tight">
											Déconnexion
										</span>
									</button>
								</LogoutAlertDialog>
							</motion.div>
						</motion.div>

						{/* Voir le site - pleine largeur en bas */}
						<div className="px-3 pb-3">
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								onClick={closePanel}
								className={cn(
									"flex items-center justify-between w-full py-2.5 px-3 rounded-xl",
									sharedItemStyles.transition,
									sharedItemStyles.focusRing,
									"text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30"
								)}
								aria-label="Voir le site (s'ouvre dans un nouvel onglet)"
							>
								<span className="flex items-center gap-2">
									<ExternalLink className="size-4 shrink-0" aria-hidden="true" />
									<span className="text-xs font-medium">Voir le site</span>
								</span>
								<ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Navigation bar */}
			<nav
				className="md:hidden fixed bottom-0 left-0 right-0 z-[60] border-t bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60 pointer-events-auto"
				aria-label="Navigation mobile principale"
			>
				<div className="flex items-center justify-around h-16 px-4 pb-[env(safe-area-inset-bottom)]">
					{/* Items principaux */}
					{primaryItems.map((item) => (
						<BottomNavItem
							key={item.id}
							item={item}
							isActive={isRouteActive(pathname, item.url)}
						/>
					))}

					{/* Bouton "Plus" */}
					<button
						type="button"
						onClick={togglePanel}
						className={cn(
							"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[64px] min-h-[48px] relative",
							"motion-safe:transition-colors motion-safe:transition-transform",
							"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
							isMoreItemActive || isOpen
								? "text-foreground font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-accent/50 active:bg-accent/30",
							"motion-safe:active:scale-95"
						)}
						aria-label="Voir plus d'options"
						aria-expanded={isOpen}
						aria-haspopup="dialog"
					>
						{/* Indicateur actif si une page du menu "Plus" est active */}
						{(isMoreItemActive || isOpen) && <ActiveIndicator />}
						<MoreHorizontal
							className="h-5 w-5 shrink-0"
							aria-hidden="true"
						/>
						<span className="text-[13px] font-medium leading-none">Plus</span>
					</button>
				</div>
			</nav>
		</>
	);
}

/**
 * Item de navigation principal (barre du bas)
 * Memoïse pour eviter les re-renders inutiles
 */
const BottomNavItem = memo(function BottomNavItem({
	item,
	isActive,
}: {
	item: NavItem;
	isActive: boolean;
}) {
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			className={cn(
				navItemStyles.base,
				isActive ? navItemStyles.active : navItemStyles.inactive
			)}
			aria-label={item.title}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			<span className="text-[13px] leading-none">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
});

/**
 * Item de navigation dans le panneau "Plus"
 * Memoïse pour eviter les re-renders inutiles
 */
const PanelNavItem = memo(function PanelNavItem({
	item,
	isActive,
	onClick,
	shouldReduceMotion,
}: {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
	shouldReduceMotion: boolean;
}) {
	const Icon = item.icon;

	return (
		<motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
			<Link
				href={item.url}
				onClick={onClick}
				className={cn(
					panelItemStyles.base,
					isActive ? panelItemStyles.active : panelItemStyles.inactive
				)}
				aria-current={isActive ? "page" : undefined}
			>
				{isActive && <ActiveIndicator />}
				<Icon className="size-5 shrink-0" aria-hidden="true" />
				<span className="text-[10px] text-center leading-tight tracking-tight line-clamp-2">
					{item.shortTitle || item.title}
				</span>
			</Link>
		</motion.div>
	);
});

/**
 * Indicateur visuel pour l'item actif (barre horizontale en haut - style iOS)
 */
function ActiveIndicator() {
	return (
		<span
			className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 bg-primary rounded-full motion-safe:animate-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
			aria-hidden="true"
		/>
	);
}
