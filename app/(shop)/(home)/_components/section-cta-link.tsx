import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

interface SectionCtaLinkProps {
	href: string;
	children: ReactNode;
	"aria-describedby"?: string;
	variant?: "outline" | "default" | "secondary" | "link";
	className?: string;
}

/** Scale-hover pour les variants « bouton » — sans objet sur `link`. */
const BUTTON_HOVER_CLASSNAME =
	"shadow-sm ease-out motion-safe:transition-transform motion-safe:duration-[var(--duration-slow)] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]";

/**
 * Bouton CTA de section d'accueil (sans haptic, nav passive vers une autre section/page).
 *
 * Hiérarchie d'incitation home : UN seul `default` (rose plein) par écran hors hero,
 * `outline` pour les actions secondaires, `link` (+ flèche) pour les rails d'appoint.
 */
export function SectionCtaLink({
	href,
	children,
	"aria-describedby": ariaDescribedBy,
	variant = "outline",
	className,
}: SectionCtaLinkProps) {
	const isLink = variant === "link";

	return (
		<Button
			asChild
			size="lg"
			variant={variant}
			className={cn(isLink ? "group gap-1 px-0" : BUTTON_HOVER_CLASSNAME, className)}
		>
			<Link href={href} aria-describedby={ariaDescribedBy}>
				{children}
				{isLink && (
					<ArrowRight
						className="size-4 motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:translate-x-0.5"
						aria-hidden="true"
					/>
				)}
			</Link>
		</Button>
	);
}
