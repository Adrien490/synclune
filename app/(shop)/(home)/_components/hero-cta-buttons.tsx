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
				className="w-full font-medium tracking-wide transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98] sm:w-auto"
			>
				<Link
					href="/produits"
					onClick={() => triggerHaptic("light")}
					className="flex items-center justify-center"
				>
					Découvrir la boutique
				</Link>
			</Button>
			<Button
				asChild
				size="lg"
				variant="secondary"
				className="w-full font-medium transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98] sm:w-auto"
			>
				<Link
					href="/personnalisation"
					onClick={() => triggerHaptic("light")}
					className="flex items-center justify-center"
				>
					Créer mon bijou
				</Link>
			</Button>
		</div>
	);
}
