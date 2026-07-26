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

export function UserDetailPageSkeleton() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du client" className="space-y-6">
			<span className="sr-only">Chargement du client…</span>

			<DetailHeaderShell>
				<div>
					<Skeleton className="h-7 w-56 sm:h-9 sm:w-72 lg:h-10" />
					<Skeleton className="mt-1 hidden h-4 w-72 md:block" />
				</div>
				<DetailStickyActionBar>
					<Skeleton className="h-11 w-full sm:h-9 md:w-24" />
				</DetailStickyActionBar>
			</DetailHeaderShell>

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitleSkeleton width="w-28" />
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 text-sm">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="flex items-center justify-between gap-3">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-32" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitleSkeleton width="w-40" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</CardContent>
					</Card>
				</div>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitleSkeleton width="w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-11 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
