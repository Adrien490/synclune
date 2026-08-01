import { Skeleton } from "@/shared/components/ui/skeleton";
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
				className={cn("mb-4 space-y-6 md:mb-6", className)}
				role="status"
				aria-busy="true"
				aria-label="Chargement de l'en-tête"
			>
				{/*
				 * `md:items-start` et `md:mt-1` sur les actions : parité avec le vrai
				 * `PageHeader` compact (`page-header.tsx`). Le skeleton utilisait
				 * `md:items-center` et n'avait pas le `md:mt-1`, donc titre et actions se
				 * décalaient verticalement au rendu réel.
				 *
				 * Hauteurs : titre `text-2xl sm:text-3xl lg:text-4xl` (40 px de
				 * line-height à `lg`) et boutons `h-11` (taille par défaut de `Button`) —
				 * le skeleton réservait `h-9` pour les deux, soit 4 px de moins par ligne.
				 */}
				<div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
					<div className="min-w-0 flex-1 gap-y-3">
						<Skeleton shape="text" className="h-9 w-48 lg:h-10" />
						{hasDescription && <Skeleton shape="text" className="h-5 w-72 lg:h-7" />}
					</div>
					{hasActions && (
						<div className="w-full shrink-0 md:mt-1 md:w-auto">
							<Skeleton shape="text" className="h-11 w-32" />
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
			<div className="relative mx-auto max-w-6xl px-4 pt-20 pb-2 sm:px-6 sm:pt-32 sm:pb-4 lg:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<div className="min-w-0 flex-1 gap-y-2">
						{/* Mobile breadcrumb row : chevron back button (si hasBreadcrumbs) + label */}
						<div className="flex items-center gap-1 sm:hidden">
							{hasBreadcrumbs && (
								<Skeleton
									shape="text"
									className="size-5 shrink-0"
									data-testid="skeleton-back-chevron"
								/>
							)}
							<Skeleton shape="text" className="h-5 w-20" />
						</div>
						{/* Breadcrumb desktop */}
						<Skeleton shape="text" className="hidden h-4 w-32 sm:block" />
						{/* Title */}
						<Skeleton shape="text" className="h-8 w-64" />
						{/* Description */}
						{hasDescription && <Skeleton shape="text" className="h-5 w-96 max-w-full" />}
					</div>
					{hasActions && (
						<div className="w-full shrink-0 sm:w-auto">
							{/* `h-11` comme la variante compact : les actions d'un `PageHeader` sont
							    des `Button` de taille par défaut (44 px), pas 36. */}
							<Skeleton shape="text" className="h-11 w-32" />
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
