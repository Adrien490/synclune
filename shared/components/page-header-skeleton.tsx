import { cn } from "@/shared/utils/cn";

interface PageHeaderSkeletonProps {
	/** Variant du header - default avec breadcrumbs, compact pour dashboard */
	variant?: "default" | "compact";
	/** Afficher le placeholder des actions */
	hasActions?: boolean;
	/** Afficher le placeholder de description */
	hasDescription?: boolean;
	/**
	 * Reflète le back button ChevronLeft mobile (à passer si la page rend des breadcrumbs).
	 * Default false. Sans effet sur variant=compact.
	 */
	hasBreadcrumbs?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Skeleton pour le PageHeader - à utiliser dans les fichiers loading.tsx
 */
export function PageHeaderSkeleton({
	variant = "default",
	hasActions = false,
	hasDescription = true,
	hasBreadcrumbs = false,
	className,
}: PageHeaderSkeletonProps) {
	if (variant === "compact") {
		return (
			<div
				className={cn("mb-4 space-y-6 motion-safe:animate-pulse md:mb-6", className)}
				role="status"
				aria-busy="true"
				aria-label="Chargement de l'en-tête"
			>
				<div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 flex-1 gap-y-3">
						<div className="bg-muted h-9 w-48 rounded" />
						{hasDescription && <div className="bg-muted h-5 w-72 rounded" />}
					</div>
					{hasActions && (
						<div className="w-full shrink-0 md:w-auto">
							<div className="bg-muted h-9 w-32 rounded" />
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<header
			className={cn("bg-background border-border relative overflow-hidden border-b", className)}
			role="status"
			aria-busy="true"
			aria-label="Chargement de l'en-tête"
		>
			<div className="relative mx-auto max-w-6xl px-4 pt-20 pb-2 motion-safe:animate-pulse sm:px-6 sm:pt-32 sm:pb-4 lg:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<div className="min-w-0 flex-1 gap-y-2">
						{/* Mobile breadcrumb row : chevron back button (si hasBreadcrumbs) + label */}
						<div className="flex items-center gap-1 sm:hidden">
							{hasBreadcrumbs && (
								<div
									className="bg-muted size-5 shrink-0 rounded"
									aria-hidden="true"
									data-testid="skeleton-back-chevron"
								/>
							)}
							<div className="bg-muted h-5 w-20 rounded" />
						</div>
						{/* Breadcrumb desktop */}
						<div className="bg-muted hidden h-4 w-32 rounded sm:block" />
						{/* Title */}
						<div className="bg-muted h-8 w-64 rounded" />
						{/* Description */}
						{hasDescription && <div className="bg-muted h-5 w-96 max-w-full rounded" />}
					</div>
					{hasActions && (
						<div className="w-full shrink-0 sm:w-auto">
							<div className="bg-muted h-9 w-32 rounded" />
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
