"use client";

import Link from "next/link";

import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { Button } from "@/shared/components/ui/button";

export function HeroCtaButtons() {
	return (
		<div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:gap-5">
			<Button
				asChild
				size="lg"
				className="motion-safe:can-hover:hover:scale-[1.02] w-full font-medium tracking-wide shadow-md ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:active:scale-[0.98] sm:w-auto"
			>
				<Link
					href="/produits"
					onClick={() => triggerHaptic("light")}
					className="flex touch-manipulation items-center justify-center"
				>
					Découvrir la boutique
				</Link>
			</Button>
			<Button
				asChild
				size="lg"
				variant="secondary"
				className="motion-safe:can-hover:hover:scale-[1.02] w-full font-medium shadow-md ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:active:scale-[0.98] sm:w-auto"
			>
				<Link
					href="/collections"
					onClick={() => triggerHaptic("light")}
					className="flex touch-manipulation items-center justify-center"
				>
					Voir les collections
				</Link>
			</Button>
		</div>
	);
}
