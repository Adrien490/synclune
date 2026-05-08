import { PageHeader } from "@/shared/components/page-header";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CloseStoreLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de fermeture"
			className="space-y-6"
		>
			<span className="sr-only">Chargement…</span>

			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/configuration/boutique">
							Paramètres boutique
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-32" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<PageHeader
				variant="compact"
				title="Fermer la boutique"
				description="Cette action interrompt immédiatement les commandes."
			/>

			<div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
				<Skeleton className="h-4 w-full max-w-md" />

				<div className="space-y-2">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-24 w-full rounded-md" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-5 w-56" />
					<Skeleton className="h-10 w-full rounded-md" />
					<Skeleton className="h-4 w-72" />
				</div>

				{/* Sticky footer mirror (1 button, mobile sticky aligned with AdminFormFooter) */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] mt-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
					<div className="flex md:justify-end">
						<Skeleton className="h-11 w-full md:w-44" />
					</div>
				</div>
			</div>
		</div>
	);
}
