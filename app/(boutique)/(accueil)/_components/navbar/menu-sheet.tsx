"use client";

import { useState } from "react";
import { Stagger } from "@/shared/components/animations/stagger";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { cn } from "@/shared/utils/cn";
import { Heart, Menu } from "lucide-react";
import Link from "next/link";

/** HREFs de la zone compte (memoisation) */
const ACCOUNT_HREFS = ["/compte", "/connexion", "/admin"] as const;
/** HREFs de la zone decouverte (memoisation) */
const DISCOVERY_HREFS = ["/", "/collections", "/produits", "/personnalisation"] as const;

/**
 * Composant Menu Sheet pour la navigation mobile
 *
 * Architecture simplifiée:
 * - Navigation directe sans sous-menus
 * - Séparation visuelle entre découverte et compte
 * - Accès direct aux pages principales
 *
 * Performance:
 * - Animation stagger pour meilleure perception UX
 * - Key dynamique basée sur pathname pour éviter les problèmes de portails
 *
 * Accessibilité:
 * - Labels ARIA descriptifs
 * - Navigation au clavier
 * - Focus visible
 */
interface MenuSheetProps {
	navItems: ReturnType<typeof getMobileNavItems>;
}

export function MenuSheet({ navItems }: MenuSheetProps) {
	const { isMenuItemActive } = useActiveNavbarItem();

	// Séparer les items en deux zones
	// Zone découverte: Accueil, Collections, Mes créations, Personnaliser
	const discoveryItems = navItems.filter((item) => DISCOVERY_HREFS.includes(item.href as typeof DISCOVERY_HREFS[number]));
	// Zone compte: Mon compte / Se connecter, Tableau de bord (admin), L'atelier
	const accountItems = navItems.filter((item) => ACCOUNT_HREFS.includes(item.href as typeof ACCOUNT_HREFS[number]));

	// Composant pour rendre un item de navigation
	const renderNavItem = (item: (typeof navItems)[0]) => {
		const isActive = isMenuItemActive(item.href);

		return (
			<SheetClose asChild key={item.href}>
				<Link
					href={item.href}
					className={cn(
						"flex items-center text-base/6 font-medium tracking-wide antialiased px-4 py-3 rounded-lg",
						"transition-all duration-300 ease-out",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
						isActive
							? "bg-primary/8 text-foreground font-semibold border-l-2 border-primary pl-5"
							: "text-foreground/80 hover:text-foreground hover:bg-primary/5 hover:pl-5"
					)}
					aria-current={isActive ? "page" : undefined}
				>
					<span>{item.label}</span>
				</Link>
			</SheetClose>
		);
	};

	// State pour aria-live (annonce ouverture/fermeture)
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Sheet onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<button
					type="button"
					className="relative -ml-3 inline-flex items-center justify-center size-11 rounded-xl lg:hidden bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
					aria-label="Ouvrir le menu de navigation"
					aria-controls="mobile-menu-synclune"
				>
					<Menu
						size={20}
						className="transition-all duration-300 group-hover:rotate-6"
						aria-hidden="true"
					/>
				</button>
			</SheetTrigger>

			{/* Aria-live region pour annoncer l'état du menu aux lecteurs d'écran */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{isOpen ? "Menu de navigation ouvert" : "Menu de navigation fermé"}
			</div>

			<SheetContent
				side="left"
				className="w-[min(85vw,320px)] sm:w-80 sm:max-w-md border-r bg-background/95 !p-0 flex flex-col overflow-hidden"
				id="mobile-menu-synclune"
				aria-describedby="mobile-menu-synclune-description"
			>
				{/* Halos décoratifs subtils */}
				<div
					className="absolute -top-20 -left-20 w-40 h-40 pointer-events-none"
					aria-hidden="true"
				>
					<div className="w-full h-full rounded-full bg-primary/10 blur-3xl" />
				</div>
				<div
					className="absolute -bottom-20 -right-20 w-32 h-32 pointer-events-none"
					aria-hidden="true"
				>
					<div className="w-full h-full rounded-full bg-secondary/15 blur-3xl" />
				</div>

				{/* Header sr-only */}
				<SheetHeader className="!p-0 sr-only">
					<SheetTitle>Menu de navigation</SheetTitle>
					<p id="mobile-menu-synclune-description">
						Menu de navigation de Synclune - Découvrez nos bijoux et collections
					</p>
				</SheetHeader>

				<nav
					aria-label="Menu principal"
					className="relative z-10 flex-1 overflow-y-auto px-4 pt-14"
				>
					{/* Zone découverte: Accueil, Collections, Mes créations, Personnaliser */}
					<Stagger stagger={0.025} delay={0.05} y={10} className="space-y-1">
						{discoveryItems.map((item) => renderNavItem(item))}
					</Stagger>

					{/* Séparateur décoratif */}
					<div
						className="relative my-6 flex items-center justify-center"
						role="separator"
						aria-hidden="true"
					>
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border/60" />
						</div>
						<div className="relative bg-background/95 px-3 rounded-full">
							<Heart className="h-4 w-4 text-muted-foreground/40 fill-muted-foreground/10" />
						</div>
					</div>

					{/* Zone compte: Mon compte / Se connecter, Tableau de bord (admin), L'atelier */}
					<Stagger stagger={0.025} delay={0.15} y={10} className="space-y-1">
						{accountItems.map((item) => renderNavItem(item))}
					</Stagger>
				</nav>

				{/* Footer avec liens secondaires */}
				<footer
					className="relative z-10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/40"
				>
					<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
						<SheetClose asChild>
							<Link
								href="/mentions-legales"
								className="hover:text-foreground transition-colors duration-200"
								aria-label="Consulter les mentions légales"
							>
								Mentions légales
							</Link>
						</SheetClose>
						<span className="text-border" aria-hidden="true">
							·
						</span>
						<SheetClose asChild>
							<Link
								href="/confidentialite"
								className="hover:text-foreground transition-colors duration-200"
								aria-label="Consulter la politique de confidentialité"
							>
								Confidentialité
							</Link>
						</SheetClose>
						<span className="text-border" aria-hidden="true">
							·
						</span>
						<SheetClose asChild>
							<Link
								href="/accessibilite"
								className="hover:text-foreground transition-colors duration-200"
								aria-label="Consulter la déclaration d'accessibilité"
							>
								Accessibilité
							</Link>
						</SheetClose>
					</div>
				</footer>
			</SheetContent>
		</Sheet>
	);
}
