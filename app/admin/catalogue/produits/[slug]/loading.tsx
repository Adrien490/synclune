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
				{/* dl rows: Statut, Type, Slug */}
				<div className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-6 w-20 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<div className="flex items-start gap-1">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="size-11 shrink-0 sm:size-9" />
						</div>
					</div>
				</div>
				{/* Description block */}
				<div className="space-y-2 border-t pt-4">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="h-4 w-2/3" />
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
			<CardContent className="space-y-3">
				<Skeleton className="h-10 w-full" />
			</CardContent>
		</Card>
	);
}

function SkusSummaryCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-24" />
			</CardHeader>
			<CardContent className="space-y-4">
				{/* dl 3 rows */}
				<div className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-6" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-6 w-10 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
				{/* Aperçu variantes : jusqu'à 3 lignes (label + badge stock) */}
				<div className="-mx-2 space-y-0.5 border-t pt-3">
					<div className="flex items-center justify-between gap-3 px-2 py-1.5">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-6 w-10 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3 px-2 py-1.5">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-6 w-10 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3 px-2 py-1.5">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-6 w-10 rounded-full" />
					</div>
				</div>
				{/* 2 boutons : Nouvelle variante + Gérer */}
				<div className="flex flex-col gap-2 sm:flex-row">
					<Skeleton className="h-10 flex-1" />
					<Skeleton className="h-10 flex-1" />
				</div>
			</CardContent>
		</Card>
	);
}

function CollectionsCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitleSkeleton width="w-28" />
			</CardHeader>
			<CardContent>
				<div className="-mx-2 space-y-1">
					<div className="flex items-center justify-between gap-3 px-2 py-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-6 w-16 rounded-full" />
					</div>
					<div className="flex items-center justify-between gap-3 px-2 py-2">
						<Skeleton className="h-4 w-28" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default function AdminProductDetailLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du bijou" className="space-y-6">
			<span className="sr-only">Chargement du bijou…</span>

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
				</BreadcrumbList>
			</Breadcrumb>

			<div className="space-y-6">
				{/* Header — h1 + date + sticky action bar mobile (mirror ProductDetailHeader) */}
				<DetailHeaderShell>
					<div>
						<Skeleton className="h-7 w-56 sm:h-9 sm:w-72 lg:h-10" />
						<Skeleton className="mt-1 hidden h-4 w-72 md:block" />
					</div>
					<DetailStickyActionBar>
						<Skeleton className="h-11 flex-1 sm:h-9 md:w-28 md:flex-none" />
						<Skeleton className="size-11 shrink-0 sm:size-9" />
					</DetailStickyActionBar>
				</DetailHeaderShell>

				{/* Grid 2/3 + sidebar */}
				<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						<MediaCardSkeleton />
						<InfoCardSkeleton />
					</div>
					<div className="space-y-6">
						<StorefrontLinkCardSkeleton />
						<SkusSummaryCardSkeleton />
						<CollectionsCardSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
}
