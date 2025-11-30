"use client";

import { Stagger } from "@/shared/components/animations/stagger";
import { Button } from "@/shared/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import type { getMobileNavItems } from "@/shared/constants/navigation";
import { useActiveNavbarItem } from "@/shared/hooks/use-active-navbar-item";
import { cn } from "@/shared/utils/cn";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
	const pathname = usePathname();

	// Séparer les items en deux zones: Découverte et Compte
	// Zone découverte: Accueil, Collections, Mes créations, Personnaliser
	// Zone compte: Mon compte / Se connecter, Tableau de bord (admin), L'atelier
	const discoveryItems = navItems.filter((item) =>
		["/", "/collections", "/produits", "/personnalisation"].includes(item.href)
	);
	const accountItems = navItems.filter((item) =>
		["/compte", "/connexion", "/admin", "/a-propos"].includes(item.href)
	);

	// Composant pour rendre un item de navigation
	const renderNavItem = (item: (typeof navItems)[0]) => {
		const isActive = isMenuItemActive(item.href);

		// Item simple
		return (
			<SheetClose asChild key={item.href}>
				<Link
					href={item.href}
					className={cn(
						"flex items-center gap-3 text-base/6 font-medium tracking-wide antialiased transition-all duration-200 rounded-none px-4 py-3 relative border-b-2",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						isActive
							? "font-semibold border-secondary"
							: "border-transparent hover:border-secondary"
					)}
					aria-current={isActive ? "page" : undefined}
				>
					<span>{item.label}</span>
				</Link>
			</SheetClose>
		);
	};

	return (
		<Sheet key={pathname}>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="lg"
					className="relative bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer p-3 group -ml-3 rounded-xl lg:hidden"
					aria-label="Ouvrir le menu de navigation"
					aria-controls="mobile-menu-synclune"
				>
					<Menu
						className="w-6 h-6 transition-transform duration-300 group-hover:rotate-6"
						aria-hidden="true"
					/>
				</Button>
			</SheetTrigger>
			<SheetContent
				side="left"
				className="w-[85vw] max-w-72 sm:w-80 sm:max-w-md border-r bg-background/95 p-6 flex flex-col"
				id="mobile-menu-synclune"
				aria-describedby="mobile-menu-synclune-description"
			>
				<SheetHeader className="pb-4">
					<SheetTitle className="sr-only">Menu de navigation</SheetTitle>
					<p id="mobile-menu-synclune-description" className="sr-only">
						Menu de navigation de Synclune - Découvrez nos bijoux et collections
					</p>
				</SheetHeader>

				<nav aria-label="Menu principal" className="flex-1 overflow-y-auto">
					{/* Zone découverte: Accueil, Collections, Mes créations, Personnaliser */}
					<Stagger stagger={0.08} delay={0.1} y={15} className="space-y-2">
						{discoveryItems.map((item) => renderNavItem(item))}
					</Stagger>

					{/* Séparateur */}
					<div className="my-6 border-t border-border/40" role="separator" />

					{/* Zone compte: Mon compte / Se connecter, Tableau de bord (admin), L'atelier */}
					<Stagger stagger={0.08} delay={0.3} y={15} className="space-y-2">
						{accountItems.map((item) => renderNavItem(item))}
					</Stagger>
				</nav>

				{/* Footer avec liens secondaires */}
				<SheetFooter className="mt-auto pt-6 border-t border-border/40">
					<div className="w-full space-y-2">
						<SheetClose asChild>
							<Link
								href="/legal"
								className="text-sm/6 tracking-normal antialiased text-muted-foreground hover:text-foreground transition-colors duration-200 block px-3 py-2.5 rounded-none"
							>
								Mentions légales
							</Link>
						</SheetClose>
						<SheetClose asChild>
							<Link
								href="/privacy"
								className="text-sm/6 tracking-normal antialiased text-muted-foreground hover:text-foreground transition-colors duration-200 block px-3 py-2.5 rounded-none"
							>
								Confidentialité
							</Link>
						</SheetClose>
						<SheetClose asChild>
							<Link
								href="/accessibility"
								className="text-sm/6 tracking-normal antialiased text-muted-foreground hover:text-foreground transition-colors duration-200 block px-3 py-2.5 rounded-none"
							>
								Accessibilité
							</Link>
						</SheetClose>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
