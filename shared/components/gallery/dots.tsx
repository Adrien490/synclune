"use client";

import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";

interface GalleryDotsProps {
	current: number;
	total: number;
	onSelect: (index: number) => void;
}

export function GalleryDots({ current, total, onSelect }: GalleryDotsProps) {
	const prefersReduced = useReducedMotion();

	// >4 images = fraction counter (ultra compact)
	if (total > 4) {
		return (
			<div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
				<div
					className="bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-white tabular-nums"
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
		<div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
			<div
				className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1 py-0.5"
				role="tablist"
				aria-label="Navigation galerie"
			>
				{Array.from({ length: total }).map((_, i) => (
					<button
						key={i}
						type="button"
						role="tab"
						onClick={() => onSelect(i)}
						aria-label={`Image ${i + 1} sur ${total}`}
						aria-selected={i === current}
						className="min-h-11 min-w-11 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-full"
					>
						<span
							className={cn(
								"rounded-full",
								!prefersReduced && "transition-all duration-200",
								i === current
									? "bg-white w-2.5 h-2.5"
									: "bg-white/80 w-2 h-2"
							)}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
