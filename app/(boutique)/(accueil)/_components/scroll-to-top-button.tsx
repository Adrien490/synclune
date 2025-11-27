"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Scroll to top button with conditional visibility
 *
 * Only shows when user has scrolled down at least 200px
 * to avoid cluttering the viewport when already at the top.
 */
export function ScrollToTopButton() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			// Show button when scrolled down 200px or more
			setIsVisible(window.scrollY > 200);
		};

		// Add scroll listener with passive flag for better performance
		window.addEventListener("scroll", handleScroll, { passive: true });

		// Check initial scroll position
		handleScroll();

		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleScrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Don't render if not visible
	if (!isVisible) return null;

	return (
		<button
			onClick={handleScrollToTop}
			className="inline-flex items-center gap-2 text-sm leading-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-3 py-2 group animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer"
			aria-label="Retour en haut de la page"
		>
			<ArrowUp
				className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform duration-200"
				aria-hidden="true"
			/>
			Retour en haut
		</button>
	);
}
