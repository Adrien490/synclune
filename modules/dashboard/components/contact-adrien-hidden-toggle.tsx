"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";

interface ContactAdrienHiddenToggleProps {
	toggle: () => void;
	isPending: boolean;
	prefersReducedMotion: boolean | null;
	transition: { type: "spring"; stiffness: number; damping: number } | { duration: number };
}

/**
 * Bouton de toggle affiché quand le FAB Contact Adrien est masqué
 * Permet de le réafficher
 */
export const ContactAdrienHiddenToggle = forwardRef<
	HTMLButtonElement,
	ContactAdrienHiddenToggleProps
>(function ContactAdrienHiddenToggle(
	{ toggle, isPending, prefersReducedMotion, transition },
	ref
) {
	return (
		<AnimatePresence>
			<motion.div
				initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
				transition={transition}
				className={cn(
					"fixed z-40",
					"bottom-20 right-0",
					"md:bottom-6 md:right-0"
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							ref={ref}
							onClick={toggle}
							variant="outline"
							size="sm"
							className={cn(
								"rounded-l-full rounded-r-none",
								"h-10 w-8 p-0",
								"bg-background",
								"border-r-0",
								"shadow-md",
								"cursor-pointer",
								"hover:bg-accent",
								"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								"focus-visible:outline-none"
							)}
							aria-label="Afficher le bouton de contact"
							aria-expanded={false}
						>
							<ChevronLeft
								className={cn("h-4 w-4", isPending && "animate-pulse")}
								aria-hidden="true"
							/>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left" sideOffset={4}>
						<p className="text-sm">Afficher Contacter Adri</p>
					</TooltipContent>
				</Tooltip>
			</motion.div>
		</AnimatePresence>
	);
});
