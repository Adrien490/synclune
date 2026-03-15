"use client";

import { cn } from "@/shared/utils/cn";
import dynamic from "next/dynamic";

const RotatingWord = dynamic(
	() =>
		import("@/shared/components/ui/rotating-word").then((mod) => ({
			default: mod.RotatingWord,
		})),
	{
		ssr: false,
		loading: () => (
			<span
				className={cn(
					"inline-flex items-center justify-center",
					"rounded-xl px-4 py-2",
					"from-primary/15 via-primary/10 to-secondary/20 bg-linear-to-r",
					"ring-primary/25 ring-1",
					"shadow-primary/15 shadow-md",
				)}
				lang="fr"
			>
				<span className="text-foreground font-light whitespace-nowrap">colorés</span>
			</span>
		),
	},
);

export interface HeroRotatingWordProps {
	words: string[];
	duration?: number;
}

/**
 * Thin client wrapper that lazy-loads RotatingWord with `ssr: false`.
 *
 * Keeps motion/react out of the hero's critical JS bundle.
 * The static fallback ("colorés") renders immediately for LCP.
 */
export function HeroRotatingWord({ words, duration }: HeroRotatingWordProps) {
	return <RotatingWord words={words} duration={duration} />;
}
