import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page detail collection
 */
export default function CollectionDetailLoading() {
	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/collections">
							Collections
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header skeleton */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" disabled>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Retour
					</Button>
					<Button disabled>
						<Pencil className="h-4 w-4 mr-2" />
						Modifier
					</Button>
				</div>
			</div>

			{/* Infos de la collection */}
			<div className="flex flex-wrap gap-3">
				<Skeleton className="h-6 w-20 rounded-full" />
				<Skeleton className="h-6 w-24 rounded-full" />
				<Skeleton className="h-6 w-20 rounded-full" />
			</div>

			{/* Liste des produits */}
			<div className="space-y-4">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-96" />

				{/* Products grid skeleton */}
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="aspect-square w-full rounded-lg" />
							<Skeleton className="h-4 w-3/4" />
							<div className="flex justify-between">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-5 w-5 rounded-full" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
