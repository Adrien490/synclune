import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function NewRefundLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de remboursement"
			className="space-y-6"
		>
			<span className="sr-only">Chargement du formulaire de remboursement…</span>

			{/* Header (desktop only — AdminMobileHeader covers mobile) */}
			<div className="hidden items-center gap-4 md:flex">
				<Skeleton className="h-9 w-24 rounded-md" />
				<div className="space-y-1">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-4 w-72" />
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column — Items selection */}
				<div className="space-y-6 lg:col-span-2">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Skeleton className="size-5 rounded" />
									<Skeleton className="h-5 w-48" />
								</div>
								<Skeleton className="h-4 w-56" />
							</div>
							<Skeleton className="h-9 w-32" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex items-start gap-4 rounded-lg border p-4">
										<Skeleton className="mt-1 size-4" />
										<Skeleton className="size-16 rounded-md" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-48" />
											<Skeleton className="h-4 w-32" />
											<div className="flex items-center gap-4">
												<Skeleton className="h-8 w-24" />
												<Skeleton className="h-4 w-20" />
											</div>
										</div>
										<Skeleton className="h-5 w-16" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column — Summary */}
				<div className="space-y-6">
					{/* Reason */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-44" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-12 w-full rounded" />
						</CardContent>
					</Card>

					{/* Note */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-40" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-20 w-full" />
						</CardContent>
					</Card>

					{/* Summary */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-8" />
							</div>
							<div className="flex justify-between">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-16" />
							</div>
							<Separator />
							<div className="flex justify-between">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-16" />
							</div>
							<div className="flex justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-16" />
							</div>
						</CardContent>
					</Card>

					{/* Sticky footer — mirror AdminFormFooter */}
					<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none">
						<Skeleton className="h-11 w-full" />
					</div>
				</div>
			</div>
		</div>
	);
}
