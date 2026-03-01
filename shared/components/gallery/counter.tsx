"use client";

interface GalleryCounterProps {
	current: number;
	total: number;
}

export function GalleryCounter({ current, total }: GalleryCounterProps) {
	return (
		<div className="absolute top-3 left-3 z-20 sm:top-4 sm:left-4">
			<div
				className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums shadow-lg backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-sm"
				role="status"
				aria-live="polite"
				aria-label={`Image ${current + 1} sur ${total}`}
			>
				{current + 1} / {total}
			</div>
		</div>
	);
}
