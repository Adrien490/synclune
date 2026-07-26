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

function CardTitleSkeleton({ width }: { width: string }) {
	return (
		<div className="flex items-center gap-2">
			<Skeleton className="size-5 rounded" />
			<Skeleton className={`h-5 ${width}`} />
		</div>
	);
}

function MediaCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-20" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="aspect-square w-full rounded-lg" />
				<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
					<Skeleton className="aspect-square rounded-md" />
					<Skeleton className="aspect-square rounded-md" />
					<Skeleton className="aspect-square rounded-md" />
				</div>
			</CardContent>
		</Card>
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
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-24" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-28" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function PricingCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-28" />
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-5 w-20" />
				</div>
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-16" />
				</div>
			</CardContent>
		</Card>
	);
}

function StockCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-20" />
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-6 w-12 rounded-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function StorefrontLinkCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-32" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-10 w-full" />
			</CardContent>
		</Card>
	);
}

function ParentProductCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-32" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="h-10 w-full" />
			</CardContent>
		</Card>
	);
}

export default function AdminSkuDetailLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la variante"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de la variante…</span>

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/produits">Produits</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-32" />
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-20" />
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="space-y-6">
				{/* Header — h1 SKU code + CopyButton, badges, subtitle, date, sticky action bar */}
				<DetailHeaderShell>
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-7 w-40 sm:h-9 sm:w-56 lg:h-10" />
							<Skeleton className="size-11 sm:size-9" />
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-6 w-24 rounded-full" />
							<Skeleton className="h-4 w-40" />
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
						<MediaCardSkeleton />
						<InfoCardSkeleton />
					</div>
					<div className="space-y-6">
						<PricingCardSkeleton />
						<StockCardSkeleton />
						<StorefrontLinkCardSkeleton />
						<ParentProductCardSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
}
