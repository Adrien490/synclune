import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

function CardLineSkeleton({ titleWidth = "w-32" }: { titleWidth?: string }) {
	return (
		<Card>
			<CardHeader>
				<Skeleton className={`h-5 ${titleWidth}`} />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="h-4 w-1/2" />
			</CardContent>
		</Card>
	);
}

export default function AdminProductTypeDetailLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du type" className="space-y-6">
			<span className="sr-only">Chargement du type…</span>

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/types-de-produits">
							Types de produits
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-32" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-7 w-56 sm:h-9 sm:w-72" />
					<Skeleton className="h-5 w-20" />
					<Skeleton className="hidden h-4 w-56 md:block" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-11 w-28 sm:h-9" />
					<Skeleton className="size-11 sm:size-9" />
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<CardLineSkeleton titleWidth="w-32" />
					<CardLineSkeleton titleWidth="w-24" />
				</div>
				<div className="space-y-6">
					<CardLineSkeleton titleWidth="w-32" />
				</div>
			</div>
		</div>
	);
}
