"use client";

interface GalleryCounterProps {
	current: number;
	total: number;
}

export function GalleryCounter({ current, total }: GalleryCounterProps) {
	return (
		<div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
			<div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg">
				{current + 1} / {total}
			</div>
		</div>
	);
}
