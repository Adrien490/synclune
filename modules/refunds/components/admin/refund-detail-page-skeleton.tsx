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

export function RefundDetailPageSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du remboursement"
			className="space-y-6"
		>
			<span className="sr-only">Chargement du remboursement…</span>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Skeleton className="h-7 w-64 sm:h-9 sm:w-80 lg:h-10" />
					<Skeleton className="mt-1 hidden h-4 w-72 md:block" />
				</div>
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
					<Skeleton className="h-11 w-full sm:h-9 md:w-24" />
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitleSkeleton width="w-28" />
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 text-sm">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center justify-between gap-3">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-32" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitleSkeleton width="w-32" />
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid gap-3 text-sm">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex items-center justify-between gap-3">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-32" />
									</div>
								))}
							</div>
							<Skeleton className="h-11 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
