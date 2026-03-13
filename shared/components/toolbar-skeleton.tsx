import { cn } from "@/shared/utils/cn";

interface ToolbarSkeletonProps {
	/** Number of select/dropdown skeletons (wide, w-32) */
	selectCount?: number;
	/** Number of icon button skeletons (narrow, w-9) */
	buttonCount?: number;
	/** Whether to show the search input skeleton */
	hasSearch?: boolean;
	className?: string;
}

/**
 * Skeleton fallback for the Toolbar component.
 * Matches the Toolbar layout to prevent CLS.
 */
export function ToolbarSkeleton({
	selectCount = 1,
	buttonCount = 0,
	hasSearch = true,
	className,
}: ToolbarSkeletonProps) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la barre d'outils"
			className={cn(
				"motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
				"flex flex-row flex-wrap items-center gap-2",
				"md:border-border/60 md:bg-card md:rounded-lg md:border md:p-4 md:shadow-sm",
				className,
			)}
		>
			{hasSearch && (
				<div className="min-w-0 flex-1 sm:min-w-48">
					<div className="animate-shimmer h-9 w-full rounded-md" />
				</div>
			)}
			<div className="flex shrink-0 flex-row items-center gap-2">
				{Array.from({ length: selectCount }).map((_, i) => (
					<div key={`s${i}`} className="animate-shimmer h-9 w-32 rounded-md" />
				))}
				{Array.from({ length: buttonCount }).map((_, i) => (
					<div key={`b${i}`} className="animate-shimmer h-9 w-9 rounded-md" />
				))}
			</div>
			<span className="sr-only">Chargement de la barre d'outils</span>
		</div>
	);
}
