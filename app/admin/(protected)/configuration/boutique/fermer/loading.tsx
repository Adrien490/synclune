import { AdminFormFooter } from "@/shared/components/admin-form-footer";
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
				className="hidden md:block"
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

				<AdminFormFooter className="mt-2 md:mt-0">
					<div className="flex md:justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
