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
				"pwa-header",
				"group fixed inset-x-0 z-40",
				"top-[var(--announcement-bar-height)]",
				"transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
				"border-b",
				isScrolled
					? "bg-background/95 border-border shadow-lg shadow-black/8 backdrop-blur-md"
					: "border-transparent bg-transparent",
			)}
		>
			{children}
		</header>
	);
}
