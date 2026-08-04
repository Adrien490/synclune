import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { FORM_SECTION_CARD_CLASS } from "@/shared/components/forms/form-section-styles";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Skeleton } from "@/shared/components/ui/skeleton";

const CARD_INNER = "px-0 sm:px-0 md:px-6";

function CardSkeleton({ children }: { children: React.ReactNode }) {
	return (
		<div className={FORM_SECTION_CARD_CLASS}>
			<div className={`${CARD_INNER} space-y-4`}>{children}</div>
		</div>
	);
}

function FieldSkeleton({ labelWidth = "w-24" }: { labelWidth?: string }) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<Skeleton className="h-10 w-full" />
		</div>
	);
}

export default function EditProductLoadingPage() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du bijou" className="space-y-6">
			<span className="sr-only">Chargement du bijou…</span>

			<Breadcrumb className="hidden md:block">
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

			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />

			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
					<div className="space-y-6 lg:col-span-2">
						{/* Media card */}
						<CardSkeleton>
							<Skeleton className="h-5 w-32" />
							<div className="grid grid-cols-3 gap-3 sm:gap-4">
								<Skeleton className="aspect-square rounded-lg" />
								<Skeleton className="aspect-square rounded-lg" />
								<Skeleton className="aspect-square rounded-lg" />
							</div>
							<Skeleton className="h-32 w-full rounded-lg" />
						</CardSkeleton>

						{/* Info card */}
						<CardSkeleton>
							<Skeleton className="h-5 w-32" />
							<FieldSkeleton labelWidth="w-28" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-24 w-full" />
							</div>
							<FieldSkeleton labelWidth="w-24" />
							<FieldSkeleton labelWidth="w-32" />
						</CardSkeleton>
					</div>

					{/* Sidebar — 5 cards */}
					<div className="space-y-6">
						<CardSkeleton>
							<Skeleton className="h-5 w-24" />
							<FieldSkeleton labelWidth="w-20" />
							<FieldSkeleton labelWidth="w-24" />
							<FieldSkeleton labelWidth="w-16" />
						</CardSkeleton>

						<CardSkeleton>
							<Skeleton className="h-5 w-28" />
							<FieldSkeleton labelWidth="w-32" />
							<FieldSkeleton labelWidth="w-36" />
						</CardSkeleton>

						<CardSkeleton>
							<Skeleton className="h-5 w-20" />
							<FieldSkeleton labelWidth="w-32" />
						</CardSkeleton>

						<CardSkeleton>
							<Skeleton className="h-5 w-20" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-6 w-32" />
								</div>
							</div>
						</CardSkeleton>

						<CardSkeleton>
							<Skeleton className="h-5 w-32" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-6 w-32" />
								</div>
							</div>
						</CardSkeleton>
					</div>
				</div>

				<AdminFormFooter>
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
