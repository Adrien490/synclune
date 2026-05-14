import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
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

export default function CreateProductLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire" className="space-y-6">
			<span className="sr-only">Chargement du formulaire…</span>

			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />

			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
					{/* Main column — Médias + Informations */}
					<div className="space-y-6 lg:col-span-2">
						{/* Médias */}
						<CardSkeleton ariaLabel="Médias du bijou" titleWidth="w-20">
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3">
									<Skeleton className="h-3 w-64 max-w-[60%]" />
									<Skeleton className="h-6 w-12 rounded-full" />
								</div>

								{/* Info banner empty state */}
								<div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
									<Skeleton className="size-5 shrink-0" />
									<Skeleton className="h-4 w-48" />
								</div>

								{/* Upload trigger button */}
								<Skeleton className="h-11 w-full rounded-md" />
								<Skeleton className="mx-auto h-3 w-56" />
							</div>
						</CardSkeleton>

						{/* Informations */}
						<CardSkeleton ariaLabel="Informations générales du bijou" titleWidth="w-32">
							<FieldSkeleton labelWidth="w-28" />

							{/* Description (textarea + counter) */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-24 w-full" />
								<Skeleton className="ml-auto h-3 w-24" />
							</div>

							{/* Type (select + plus button) */}
							<FieldWithAddButtonSkeleton labelWidth="w-24" />

							{/* Collections (multi-select + hint) */}
							<FieldSkeleton labelWidth="w-24" hintWidth="w-64" />
						</CardSkeleton>
					</div>

					{/* Sidebar — 4 cards */}
					<div className="space-y-6">
						{/* Variante */}
						<CardSkeleton ariaLabel="Variante initiale" titleWidth="w-24">
							<FieldWithAddButtonSkeleton labelWidth="w-20" />
							<FieldWithAddButtonSkeleton labelWidth="w-24" />
							<FieldSkeleton labelWidth="w-16" />
						</CardSkeleton>

						{/* Tarification */}
						<CardSkeleton ariaLabel="Tarification" titleWidth="w-28">
							<FieldSkeleton labelWidth="w-32" hintWidth="w-40" />
							<FieldSkeleton labelWidth="w-40" hintWidth="w-56" />
						</CardSkeleton>

						{/* Stock */}
						<CardSkeleton ariaLabel="Stock" titleWidth="w-20">
							<FieldSkeleton labelWidth="w-32" hintWidth="w-52" />
						</CardSkeleton>

						{/* Statut */}
						<CardSkeleton ariaLabel="Statut du bijou" titleWidth="w-20">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<div className="space-y-2">
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-6 w-32" />
								</div>
								<Skeleton className="h-3 w-72 max-w-full" />
							</div>
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
