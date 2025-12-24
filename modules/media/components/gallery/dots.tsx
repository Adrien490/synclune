"use client";

import { cn } from "@/shared/utils/cn";

interface GalleryDotsProps {
	current: number;
	total: number;
	onSelect: (index: number) => void;
}

export function GalleryDots({ current, total, onSelect }: GalleryDotsProps) {
	return (
		<div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1.5">
			{Array.from({ length: total }).map((_, i) => (
				<button
					key={i}
					type="button"
					onClick={() => onSelect(i)}
					aria-label={`Image ${i + 1} sur ${total}`}
					className="size-11 flex items-center justify-center touch-manipulation"
				>
					<span
						className={cn(
							"rounded-full transition-all duration-300",
							i === current
								? "bg-white w-2.5 h-2.5 shadow-[0_0_6px_1px] shadow-white/50"
								: "bg-white/40 w-2 h-2 hover:bg-white/60"
						)}
					/>
				</button>
			))}
		</div>
	);
}
