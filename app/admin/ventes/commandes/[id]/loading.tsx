import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderDetailLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la commande"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de la commande…</span>

			{/* Mobile back link (mirror page.tsx Link md:hidden) */}
			<div className="md:hidden">
				<Skeleton className="h-5 w-40" />
			</div>

			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes/commandes">Commandes</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* OrderDetailPage inner wrapper (space-y-6) */}
			<div className="space-y-6">
				{/* OrderHeader: h1+date hidden md:block + sticky action bar mobile */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="hidden space-y-2 md:block">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-72" />
					</div>
					<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
						<Skeleton className="h-11 flex-1 sm:h-9 md:w-28 md:flex-none" />
						<Skeleton className="size-11 shrink-0 sm:size-9" />
					</div>
				</div>

				{/* Progress Stepper */}
				<div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="size-8 rounded-full" />
							<Skeleton className="hidden h-4 w-16 sm:block" />
						</div>
					))}
				</div>

				{/* Status Badges */}
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-6 w-24 rounded-full" />
					<Skeleton className="h-6 w-28 rounded-full" />
					<Skeleton className="h-6 w-20 rounded-full" />
				</div>

				{/* Grid 2/3 + 1/3 */}
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Left column - 2/3: Items */}
					<div className="space-y-6 lg:col-span-2">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex gap-4 py-2">
										<Skeleton className="size-16 rounded-md" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-48" />
											<Skeleton className="h-3 w-32" />
										</div>
										<Skeleton className="h-4 w-16" />
									</div>
								))}
								<div className="space-y-2 border-t pt-4">
									<div className="flex justify-between">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-16" />
									</div>
									<div className="flex justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-16" />
									</div>
									<div className="flex justify-between">
										<Skeleton className="h-5 w-16" />
										<Skeleton className="h-5 w-20" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right column - 1/3: Customer, Refunds, Address, Payment, History */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-24" />
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-full" />
									<div className="space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-40" />
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-8 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-4 w-full" />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-36" />
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-4 w-24" />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-24" />
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-32" />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-28" />
							</CardHeader>
							<CardContent className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex gap-3">
										<Skeleton className="size-4 rounded-full" />
										<div className="flex-1 space-y-1">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
