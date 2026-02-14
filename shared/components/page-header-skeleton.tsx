import { cn } from "@/shared/utils/cn";

interface PageHeaderSkeletonProps {
	/** Variant du header - default avec breadcrumbs, compact pour dashboard */
	variant?: "default" | "compact";
	/** Afficher le placeholder des actions */
	hasActions?: boolean;
	/** Afficher le placeholder de description */
	hasDescription?: boolean;
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
	className,
}: PageHeaderSkeletonProps) {
	if (variant === "compact") {
		return (
			<div
				className={cn("space-y-6 mb-4 md:mb-6 animate-pulse", className)}
				role="status"
				aria-busy="true"
				aria-label="Chargement de l'en-tête"
			>
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
					<div className="min-w-0 flex-1 space-y-3">
						<div className="h-9 w-48 bg-muted rounded" />
						{hasDescription && <div className="h-5 w-72 bg-muted rounded" />}
					</div>
					{hasActions && (
						<div className="shrink-0 w-full md:w-auto">
							<div className="h-9 w-32 bg-muted rounded" />
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<header
			className={cn(
				"relative overflow-hidden bg-background border-b border-border",
				className
			)}
			role="status"
			aria-busy="true"
			aria-label="Chargement de l'en-tête"
		>
			<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 pb-2 sm:pb-4 animate-pulse">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
					<div className="min-w-0 flex-1 space-y-2">
						{/* Breadcrumb mobile */}
						<div className="sm:hidden h-5 w-20 bg-muted rounded" />
						{/* Breadcrumb desktop */}
						<div className="hidden sm:block h-4 w-32 bg-muted rounded" />
						{/* Title */}
						<div className="h-8 w-64 bg-muted rounded" />
						{/* Description */}
						{hasDescription && (
							<div className="h-5 w-96 max-w-full bg-muted rounded" />
						)}
					</div>
					{hasActions && (
						<div className="shrink-0 w-full sm:w-auto">
							<div className="h-9 w-32 bg-muted rounded" />
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
