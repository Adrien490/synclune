"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";

interface NavbarWrapperProps {
	children: React.ReactNode;
}

/**
 * Wrapper client de la Navbar avec effet de scroll (glass effect)
 *
 * Features:
 * - Glass effect au scroll avec backdrop-blur
 * - Fixed white background (no dark mode)
 * - data-scrolled pour animations enfants
 * - Safe area pour les appareils avec notch
 */
export function NavbarWrapper({ children }: NavbarWrapperProps) {
	const isScrolled = useIsScrolled(20);

	return (
		<header
			data-scrolled={isScrolled}
			className={cn(
				"group fixed top-0 inset-x-0 z-40",
				"transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
				"border-b pt-[env(safe-area-inset-top)]",
				isScrolled
					? "bg-background/95 backdrop-blur-md border-border shadow-lg shadow-black/5"
					: "bg-transparent border-transparent"
			)}
		>
			{children}
		</header>
	);
}
