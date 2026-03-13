"use client";

import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";

interface GalleryDotsProps {
	current: number;
	total: number;
	onSelect: (index: number) => void;
}

export function GalleryDots({ current, total, onSelect }: GalleryDotsProps) {
	const prefersReduced = useReducedMotion();

	// >5 images = fraction counter (ultra compact)
	if (total > 5) {
		return (
			<div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 sm:hidden">
				<div
					className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur-sm"
					role="status"
					aria-live="polite"
					aria-label={`Image ${current + 1} sur ${total}`}
				>
					{current + 1}/{total}
				</div>
			</div>
		);
	}

	// ≤4 images = dots compacts avec touch targets WCAG (44px minimum)
	return (
		<div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 sm:hidden">
			<div
				className="flex items-center gap-1 rounded-full bg-black/50 px-1 py-0.5 backdrop-blur-sm"
				role="tablist"
				aria-label="Navigation galerie"
			>
				{Array.from({ length: total }).map((_, i) => (
					<button
						key={i}
						type="button"
						role="tab"
						aria-controls={`gallery-panel-${i}`}
						onClick={() => onSelect(i)}
						aria-label={`Image ${i + 1} sur ${total}`}
						aria-selected={i === current}
						className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 focus-visible:outline-none"
					>
						<span
							className={cn(
								"rounded-full",
								!prefersReduced && "transition-all duration-200",
								i === current ? "h-2.5 w-2.5 bg-white ring-1 ring-white/50" : "h-2 w-2 bg-white/80",
							)}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
