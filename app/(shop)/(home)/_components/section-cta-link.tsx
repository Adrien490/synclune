import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";

interface SectionCtaLinkProps {
	href: string;
	children: ReactNode;
	"aria-describedby"?: string;
	variant?: "outline" | "default" | "secondary";
	className?: string;
}

/**
 * Bouton CTA de section d'accueil (sans haptic, nav passive vers une autre section/page).
 */
export function SectionCtaLink({
	href,
	children,
	"aria-describedby": ariaDescribedBy,
	variant = "outline",
	className = "ease-out hover:shadow-md motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--duration-slow)] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
}: SectionCtaLinkProps) {
	return (
		<Button asChild size="lg" variant={variant} className={className}>
			<Link href={href} aria-describedby={ariaDescribedBy}>
				{children}
			</Link>
		</Button>
	);
}
