import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Toolbar } from "@/shared/components/toolbar";
import { Skeleton } from "@/shared/components/ui/skeleton";
/**
 * Loading skeleton pour la page de liste des produits
 * Structure: Header + Status Navigation + Toolbar + Filters + Data Table
 */
export default function ProductsListLoading() {
	return (
		<div className="space-y-6">
			{/* Page Header */}
			<PageHeader
				title="Bijoux"
				description="Gérez votre catalogue de bijoux"
				variant="compact"
				action={
					<Button disabled>Nouveau produit</Button>
				}
			/>

			{/* Status Navigation - Skeleton tabs */}
			<div className="flex items-center gap-2 overflow-x-auto pb-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-9 w-24 rounded-md" />
				))}
			</div>

			{/* Toolbar with Search, Sort, and Filters */}
			<Toolbar ariaLabel="Barre d'outils de gestion des produits">
				<div className="flex flex-1 flex-wrap items-center gap-2">
					{/* Search */}
					<Skeleton className="h-10 w-full sm:max-w-md" />

					{/* Sort */}
					<Skeleton className="h-10 w-full sm:min-w-[180px] sm:max-w-[200px]" />

					{/* Filter button */}
					<Skeleton className="h-10 w-[100px]" />
				</div>
			</Toolbar>

			{/* Active Filter Badges Area */}
			<div className="flex flex-wrap gap-2">
				<Skeleton className="h-7 w-24 rounded-full" />
				<Skeleton className="h-7 w-32 rounded-full" />
			</div>

			{/* Data Table */}
			<div className="rounded-md border">
				{/* Table Header */}
				<div className="border-b bg-muted/50 p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4" />
						<div className="hidden lg:block">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="flex-1">
							<Skeleton className="h-4 w-20" />
						</div>
						<div className="hidden lg:block w-[15%]">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="hidden sm:block text-center">
							<Skeleton className="h-4 w-20 mx-auto" />
						</div>
						<div className="hidden lg:block">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="hidden lg:block text-center">
							<Skeleton className="h-4 w-12 mx-auto" />
						</div>
						<div className="w-[15%] sm:w-[8%]">
							<Skeleton className="h-4 w-16 ml-auto" />
						</div>
					</div>
				</div>

				{/* Table Rows */}
				<div className="divide-y">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="p-4">
							<div className="flex items-center gap-4">
								{/* Checkbox */}
								<Skeleton className="h-4 w-4" />

								{/* Image - hidden on mobile */}
								<div className="hidden lg:block">
									<Skeleton className="h-12 w-12 rounded-md" />
								</div>

								{/* Title */}
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-32" />
								</div>

								{/* Type - hidden on lg- */}
								<div className="hidden lg:block w-[15%]">
									<Skeleton className="h-6 w-20 rounded-full" />
								</div>

								{/* Variants count - hidden on sm- */}
								<div className="hidden sm:block text-center">
									<Skeleton className="h-4 w-8 mx-auto" />
								</div>

								{/* Price range - hidden on lg- */}
								<div className="hidden lg:block">
									<Skeleton className="h-4 w-24" />
								</div>

								{/* Stock - hidden on lg- */}
								<div className="hidden lg:block text-center">
									<Skeleton className="h-6 w-12 mx-auto rounded-full" />
								</div>

								{/* Actions */}
								<div className="w-[15%] sm:w-[8%] flex justify-end">
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
		</div>
	);
}
