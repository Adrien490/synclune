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

export default function AdminColorDetailLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement de la couleur" className="space-y-6">
			<span className="sr-only">Chargement de la couleur…</span>

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/couleurs">Couleurs</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-7 w-48 sm:h-9 sm:w-64" />
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
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
						</CardHeader>
						<CardContent className="flex flex-col items-center gap-4 py-8">
							<Skeleton className="size-24 rounded-full sm:size-40" />
							<Skeleton className="h-4 w-20" />
						</CardContent>
					</Card>
					<CardLineSkeleton titleWidth="w-32" />
					<CardLineSkeleton titleWidth="w-28" />
				</div>
				<div className="space-y-6">
					<CardLineSkeleton titleWidth="w-32" />
				</div>
			</div>
		</div>
	);
}
