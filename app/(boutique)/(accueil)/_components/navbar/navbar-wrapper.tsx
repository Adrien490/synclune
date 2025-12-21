"use client";

import { useIsScrolled } from "@/shared/hooks/use-is-scrolled";
import { cn } from "@/shared/utils/cn";

interface NavbarWrapperProps {
	children: React.ReactNode;
}

/**
 * Wrapper client de la Navbar avec effet de scroll (glass effect)
 */
export function NavbarWrapper({ children }: NavbarWrapperProps) {
	const isScrolled = useIsScrolled(20);
	return (
		<header
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
