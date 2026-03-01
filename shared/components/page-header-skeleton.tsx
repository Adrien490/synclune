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
				className={cn("mb-4 animate-pulse space-y-6 md:mb-6", className)}
				role="status"
				aria-busy="true"
				aria-label="Chargement de l'en-tête"
			>
				<div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0 flex-1 space-y-3">
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
			<div className="relative mx-auto max-w-6xl animate-pulse px-4 pt-20 pb-2 sm:px-6 sm:pt-32 sm:pb-4 lg:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<div className="min-w-0 flex-1 space-y-2">
						{/* Breadcrumb mobile */}
						<div className="bg-muted h-5 w-20 rounded sm:hidden" />
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
