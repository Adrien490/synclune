import { PageHeader } from "@/shared/components/page-header";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

interface SectionNavigationLoadingProps {
	title: string;
	description?: string;
	columns?: 1 | 2 | 3;
	count: number;
}

const GRID_COLS = {
	1: "grid-cols-1",
	2: "grid-cols-1 md:grid-cols-2",
	3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
} as const satisfies Record<1 | 2 | 3, string>;

/**
 * Skeleton parité-stricte avec `SectionNavigation` (cards de navigation hub admin).
 * Utilisé par les 5 `loading.tsx` section-index : catalogue, ventes, marketing, contenu, configuration.
 */
export function SectionNavigationLoading({
	title,
	description,
	columns = 2,
	count,
}: SectionNavigationLoadingProps) {
	return (
		<div role="status" aria-busy="true" aria-label={`Chargement : ${title.toLowerCase()}`}>
			<span className="sr-only">Chargement…</span>

			<PageHeader
				variant="compact"
				title={title}
				description={description}
				className="hidden md:block"
			/>

			{description && (
				<div className="mb-4 md:hidden">
					<Skeleton className="h-4 w-72 max-w-full" />
				</div>
			)}

			<div className={cn("grid gap-4", GRID_COLS[columns])}>
				{Array.from({ length: count }).map((_, i) => (
					<Card key={i} className="h-full">
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-lg" />
									<div className="space-y-2">
										<Skeleton className="h-5 w-24" />
										<Skeleton className="h-4 w-40" />
									</div>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
