import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function AccountLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de votre espace client"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de votre espace client…</span>

			<div className="space-y-2">
				<Skeleton className="h-7 w-48 sm:h-8" />
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					{Array.from({ length: 2 }).map((_, i) => (
						<Card key={i}>
							<CardHeader className="space-y-2">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-56 max-w-full" />
							</CardHeader>
							<CardContent className="space-y-4">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
								<div className="flex flex-wrap items-center gap-3 pt-2">
									<Skeleton className="h-9 w-28" />
									<Skeleton className="h-9 w-24" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
						</CardHeader>
						<CardContent className="space-y-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-10 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
