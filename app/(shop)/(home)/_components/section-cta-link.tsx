"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import type { HapticPattern } from "@/shared/hooks/use-haptic";

interface SectionCtaLinkProps {
	href: string;
	children: ReactNode;
	hapticPattern?: HapticPattern;
	"aria-describedby"?: string;
	variant?: "outline" | "default" | "secondary";
	className?: string;
}

/**
 * Bouton CTA de section d'accueil avec haptic feedback natif mobile 2026.
 * Utilisé par LatestCreations, CollectionsSection, ReviewsSection, FaqSection.
 */
export function SectionCtaLink({
	href,
	children,
	hapticPattern = "selection",
	"aria-describedby": ariaDescribedBy,
	variant = "outline",
	className = "transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
}: SectionCtaLinkProps) {
	const haptic = useHaptic();

	return (
		<Button asChild size="lg" variant={variant} className={className}>
			<Link href={href} onClick={() => haptic(hapticPattern)} aria-describedby={ariaDescribedBy}>
				{children}
			</Link>
		</Button>
	);
}
