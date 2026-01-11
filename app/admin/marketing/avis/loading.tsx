import { MessageSquare, CheckCircle2, EyeOff } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Toolbar } from "@/shared/components/toolbar";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page admin des avis
 */
export default function ReviewsAdminLoading() {
	return (
		<>
			<PageHeader variant="compact" title="Avis clients" />

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Total avis
							</p>
							<Skeleton className="h-8 w-16 mt-1" />
						</div>
						<MessageSquare className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Publies
							</p>
							<Skeleton className="h-8 w-12 mt-1" />
						</div>
						<CheckCircle2 className="h-8 w-8 text-secondary-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Masques
							</p>
							<Skeleton className="h-8 w-12 mt-1" />
						</div>
						<EyeOff className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<Toolbar ariaLabel="Barre d'outils de gestion des avis">
				<div className="flex flex-1 flex-wrap items-center gap-2">
					<Skeleton className="h-10 w-full sm:max-w-md" />
					<Skeleton className="h-10 w-[150px]" />
					<Skeleton className="h-10 w-[150px]" />
					<Skeleton className="h-10 w-45" />
				</div>
			</Toolbar>

			{/* DataTable skeleton */}
			<div className="rounded-md border">
				{/* Table Header */}
				<div className="border-b bg-muted/50 p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4" />
						<div className="flex-1">
							<Skeleton className="h-4 w-20" />
						</div>
						<div className="hidden md:block w-24">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="hidden lg:block w-32">
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="w-20">
							<Skeleton className="h-4 w-12" />
						</div>
						<div className="w-24">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="w-20">
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
				</div>

				{/* Table Rows */}
				<div className="divide-y">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="p-4">
							<div className="flex items-center gap-4">
								<Skeleton className="h-4 w-4" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-32" />
								</div>
								<div className="hidden md:block w-24">
									<Skeleton className="h-4 w-20" />
								</div>
								<div className="hidden lg:block w-32">
									<Skeleton className="h-4 w-24" />
								</div>
								<div className="w-20">
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="w-24">
									<Skeleton className="h-6 w-16 rounded-full" />
								</div>
								<div className="w-20">
									<Skeleton className="h-8 w-8 rounded-md" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="border-t p-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-40" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-9 w-24" />
							<Skeleton className="h-9 w-24" />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
