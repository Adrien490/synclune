"use client";

import { cn } from "@/shared/utils/cn";

interface GalleryDotsProps {
	current: number;
	total: number;
	onSelect: (index: number) => void;
}

export function GalleryDots({ current, total, onSelect }: GalleryDotsProps) {
	// >4 images = fraction counter (ultra compact)
	if (total > 4) {
		return (
			<div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
				<div className="bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-white tabular-nums">
					{current + 1}/{total}
				</div>
			</div>
		);
	}

	// ≤4 images = dots compacts
	return (
		<div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
			<div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1.5">
				{Array.from({ length: total }).map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => onSelect(i)}
						aria-label={`Image ${i + 1} sur ${total}`}
						className="size-6 flex items-center justify-center touch-manipulation"
					>
						<span
							className={cn(
								"rounded-full transition-all duration-200",
								i === current
									? "bg-white w-2 h-2"
									: "bg-white/50 w-1.5 h-1.5"
							)}
						/>
					</button>
				))}
			</div>
		</div>
	);
}
