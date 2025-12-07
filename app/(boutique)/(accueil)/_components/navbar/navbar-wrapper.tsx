"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";

/**
 * Props du wrapper de la Navbar
 */
interface NavbarWrapperProps {
	/** Contenu de la navbar (typiquement le composant Navbar) */
	children: React.ReactNode;
}

/**
 * Wrapper client de la Navbar avec effet de scroll
 *
 * Gère l'apparence de la navbar en fonction du scroll :
 * - En haut de page : transparent avec bordure transparente
 * - Après scroll (> 20px) : glass effect (bg-white/95) avec ombre et bordure
 *
 * Architecture :
 * - Client Component ("use client") - nécessaire pour détecter le scroll
 * - Utilise le hook useIsScrolled pour détecter le scroll (listener passive pour performance)
 * - Transition fluide de 300ms entre les états
 *
 * Performance :
 * - Listener scroll avec { passive: true } pour éviter de bloquer le scroll
 * - État local minimal (boolean)
 * - Re-renders limités aux changements d'état scroll
 *
 * @param props - Les props du composant
 * @param props.children - Le contenu à wrapper (Navbar)
 * @returns Un header fixed avec glass effect dynamique
 */
export function NavbarWrapper({ children }: NavbarWrapperProps) {
	const isScrolled = useIsScrolled(20);
	return (
		<header
			data-scrolled={isScrolled}
			className={cn(
				"fixed top-0 inset-x-0 z-40 transition-all duration-300 ease-out",
				"border-b pt-[env(safe-area-inset-top)]",
				isScrolled
					? "bg-white/95 [@supports(backdrop-filter:blur(4px))]:backdrop-blur-sm border-border/60 shadow-lg"
					: "bg-transparent border-transparent"
			)}
		>
			{children}
		</header>
	);
}
