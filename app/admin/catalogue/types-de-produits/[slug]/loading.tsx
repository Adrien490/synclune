import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

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

			<div className="space-y-6">
				{/* Header — mirror ProductTypeDetailHeader */}
				<DetailHeaderShell>
					<div className="min-w-0 space-y-2">
						<Skeleton className="h-7 w-56 sm:h-9 sm:w-72 lg:h-10" />
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-6 w-16 rounded-full" />
						</div>
						<Skeleton className="hidden h-4 w-72 md:block" />
					</div>
					<DetailStickyActionBar>
						<Skeleton className="h-11 flex-1 sm:h-9 md:w-28 md:flex-none" />
						<Skeleton className="size-11 shrink-0 sm:size-9" />
					</DetailStickyActionBar>
				</DetailHeaderShell>

				<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						<CardLineSkeleton titleWidth="w-32" />
						<CardLineSkeleton titleWidth="w-28" />
					</div>
					<div className="space-y-6">
						<CardLineSkeleton titleWidth="w-24" />
					</div>
				</div>
			</div>
		</div>
	);
}
