import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

function CardTitleSkeleton({ width }: { width: string }) {
	return (
		<div className="flex items-center gap-2">
			<Skeleton className="size-5 rounded" />
			<Skeleton className={`h-5 ${width}`} />
		</div>
	);
}

function InfoCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-28" />
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-6 w-20 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-28" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-14" />
						<Skeleton className="h-4 w-16" />
					</div>
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<div className="flex items-start gap-1">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="size-11 shrink-0 sm:size-9" />
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ValidityCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-40" />
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 text-sm">
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-40" />
					</div>
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-40" />
					</div>
				</div>
				<div className="border-t pt-4">
					<Skeleton className="h-4 w-2/3" />
				</div>
			</CardContent>
		</Card>
	);
}

function UsageCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-24" />
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-baseline justify-between gap-3">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-6 w-16" />
					</div>
					<Skeleton className="h-2 w-full rounded-full" />
				</div>
				<div className="border-t pt-4">
					<Skeleton className="h-4 w-2/3" />
				</div>
			</CardContent>
		</Card>
	);
}

export default function AdminDiscountDetailLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du code promo" className="space-y-6">
			<span className="sr-only">Chargement du code promo…</span>

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/marketing/discounts">Codes promo</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<Skeleton className="h-9 w-40 sm:h-12 sm:w-56" />
						<Skeleton className="mt-2 hidden h-4 w-72 md:block" />
					</div>
					<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
						<Skeleton className="h-11 flex-1 sm:h-9 md:w-28 md:flex-none" />
						<Skeleton className="size-11 shrink-0 sm:size-9" />
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						<InfoCardSkeleton />
						<ValidityCardSkeleton />
					</div>
					<div className="space-y-6">
						<UsageCardSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
}
