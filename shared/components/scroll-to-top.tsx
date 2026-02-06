"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD = 1200;

export function ScrollToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		function onScroll() {
			setVisible(window.scrollY > SCROLL_THRESHOLD);
		}

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	function scrollToTop() {
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion ? "instant" : "smooth",
		});
	}

	return (
		<button
			type="button"
			onClick={scrollToTop}
			aria-label="Retour en haut de la page"
			tabIndex={visible ? 0 : -1}
			className={cn(
				"fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40",
				"size-11 rounded-full bg-background/80 backdrop-blur-sm shadow-md border",
				"flex items-center justify-center",
				"hover:bg-background hover:shadow-lg",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				"motion-safe:transition-all motion-safe:duration-300",
				visible
					? "opacity-100 motion-safe:translate-y-0"
					: "opacity-0 motion-safe:translate-y-4 pointer-events-none",
			)}
		>
			<ChevronUp className="size-5" />
		</button>
	);
}
