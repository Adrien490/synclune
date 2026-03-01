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
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Total avis</p>
							<Skeleton className="mt-1 h-8 w-16" />
						</div>
						<MessageSquare className="text-muted-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Publies</p>
							<Skeleton className="mt-1 h-8 w-12" />
						</div>
						<CheckCircle2 className="text-secondary-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Masques</p>
							<Skeleton className="mt-1 h-8 w-12" />
						</div>
						<EyeOff className="text-muted-foreground h-8 w-8" />
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
				<div className="bg-muted/50 border-b p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4" />
						<div className="flex-1">
							<Skeleton className="h-4 w-20" />
						</div>
						<div className="hidden w-24 md:block">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="hidden w-32 lg:block">
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
								<div className="hidden w-24 md:block">
									<Skeleton className="h-4 w-20" />
								</div>
								<div className="hidden w-32 lg:block">
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
