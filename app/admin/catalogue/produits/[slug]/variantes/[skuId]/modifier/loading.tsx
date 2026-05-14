import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Skeleton } from "@/shared/components/ui/skeleton";

const CARD_SHELL =
	"lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md";
const CARD_INNER = "px-0 sm:px-0 lg:px-6";

function CardSkeleton({
	ariaLabel,
	titleWidth,
	children,
}: {
	ariaLabel: string;
	titleWidth: string;
	children: React.ReactNode;
}) {
	return (
		<div role="region" aria-label={ariaLabel} className={CARD_SHELL}>
			<div className={CARD_INNER}>
				<Skeleton className={`h-5 ${titleWidth}`} />
			</div>
			<div className={`${CARD_INNER} space-y-4`}>{children}</div>
		</div>
	);
}

function FieldSkeleton({
	labelWidth = "w-24",
	hintWidth,
}: {
	labelWidth?: string;
	hintWidth?: string;
}) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<Skeleton className="h-10 w-full" />
			{hintWidth ? <Skeleton className={`h-3 ${hintWidth}`} /> : null}
		</div>
	);
}

function FieldWithAddButtonSkeleton({ labelWidth }: { labelWidth: string }) {
	return (
		<div className="space-y-2">
			<Skeleton className={`h-4 ${labelWidth}`} />
			<div className="flex gap-2">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="size-11 shrink-0 sm:size-9" />
			</div>
		</div>
	);
}

export default function EditVariantLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de l'édition de variante"
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

			<PageHeaderSkeleton variant="compact" hasDescription className="hidden md:block" />

			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
					{/* Main column — Médias + Attributs + Statut */}
					<div className="space-y-6 lg:col-span-2">
						<CardSkeleton ariaLabel="Médias de la variante" titleWidth="w-20">
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="aspect-square w-full max-w-xs rounded-lg" />
							</div>
							<div className="space-y-2 border-t pt-4">
								<Skeleton className="h-4 w-24" />
								<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
									<Skeleton className="aspect-square rounded-md" />
									<Skeleton className="aspect-square rounded-md" />
									<Skeleton className="aspect-square rounded-md" />
								</div>
							</div>
						</CardSkeleton>

						<CardSkeleton ariaLabel="Attributs de la variante" titleWidth="w-24">
							<FieldWithAddButtonSkeleton labelWidth="w-20" />
							<FieldWithAddButtonSkeleton labelWidth="w-24" />
							<FieldSkeleton labelWidth="w-16" />
						</CardSkeleton>

						<CardSkeleton ariaLabel="Statut de la variante" titleWidth="w-20">
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-6 w-32" />
								</div>
								<Skeleton className="h-3 w-72 max-w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<div className="flex items-center gap-2">
									<Skeleton className="size-5 rounded" />
									<Skeleton className="h-4 w-56" />
								</div>
								<Skeleton className="h-3 w-72 max-w-full" />
							</div>
						</CardSkeleton>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						<CardSkeleton ariaLabel="Tarification" titleWidth="w-28">
							<FieldSkeleton labelWidth="w-32" hintWidth="w-40" />
							<FieldSkeleton labelWidth="w-40" hintWidth="w-56" />
						</CardSkeleton>
						<CardSkeleton ariaLabel="Stock" titleWidth="w-20">
							<FieldSkeleton labelWidth="w-32" hintWidth="w-52" />
						</CardSkeleton>
					</div>
				</div>

				{/* Sticky footer — mirror AdminFormFooter */}
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none">
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</div>
			</div>
		</div>
	);
}
