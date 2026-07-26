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

export default function OrderDetailLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de la commande"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de la commande…</span>

			{/* Pas de skeleton de lien retour mobile : `page.tsx` n'en rend aucun (le
			    chevron vient de l'`AdminMobileHeader`). Il provoquait un décalage de
			    ~20 px à l'hydratation. */}

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
				<DetailHeaderShell>
					<div className="hidden space-y-2 md:block">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-72" />
					</div>
					<DetailStickyActionBar>
						<Skeleton className="h-11 flex-1 sm:h-9 md:w-28 md:flex-none" />
						<Skeleton className="size-11 shrink-0 sm:size-9" />
					</DetailStickyActionBar>
				</DetailHeaderShell>

				{/* Progress Stepper — `flex-1` sans `overflow-x-auto` : le vrai
				    `OrderProgressStepper` masque ses libellés sous 400 px (`min-[400px]:block`)
				    au lieu de scroller, donc un conteneur scrollable ici décalait la mise en
				    page à l'hydratation. */}
				<div className="flex items-center justify-between gap-2 py-2">
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

				{/* Grid 2/3 + 1/3 — mêmes classes que `order-detail-page` (gap-0 + marges
				    négatives + divide-y sous md), sinon la mise en page saute à l'hydratation
				    sur mobile. */}
				<div className="grid gap-0 md:gap-6 lg:grid-cols-3">
					{/* Left column - 2/3: Items */}
					<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0 lg:col-span-2">
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

					{/* Right column - 1/3: Customer, Refunds, Address, Payment, Invoice, History */}
					<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0">
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

						{/* OrderInvoiceCard — slot manquant : le skeleton n'en comptait que 5 pour
						    6 cartes rendues, la colonne s'allongeait donc à l'hydratation. */}
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-9 w-full" />
							</CardContent>
						</Card>

						{/* OrderHistoryTimeline */}
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
