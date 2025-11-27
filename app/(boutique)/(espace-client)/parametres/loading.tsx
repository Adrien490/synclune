import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

export default function SettingsLoading() {
	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Paramètres", href: "/parametres" },
	];

	return (
		<>
			<PageHeader
				title="Paramètres du compte"
				description="Gérez vos informations personnelles et la sécurité de votre compte"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Colonne principale - 2/3 */}
						<div className="lg:col-span-2 space-y-6">
							{/* Profil skeleton */}
							<Card>
								<CardHeader>
									<div className="flex items-center gap-2">
										<Skeleton className="w-5 h-5 rounded" />
										<Skeleton className="h-6 w-48" />
									</div>
									<Skeleton className="h-4 w-64 mt-1" />
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-3 w-72" />
									</div>
									<div className="space-y-2">
										<Skeleton className="h-4 w-12" />
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-3 w-64" />
									</div>
									<Skeleton className="h-10 w-52" />
								</CardContent>
							</Card>

							{/* Sécurité skeleton */}
							<Card>
								<CardHeader>
									<div className="flex items-center gap-2">
										<Skeleton className="w-5 h-5 rounded" />
										<Skeleton className="h-6 w-24" />
									</div>
									<Skeleton className="h-4 w-80 mt-1" />
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-10 w-full" />
									</div>
									<div className="space-y-2">
										<Skeleton className="h-4 w-44" />
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-3 w-64" />
									</div>
									<div className="space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-10 w-full" />
									</div>
									<Skeleton className="h-14 w-full rounded-lg" />
									<div className="flex justify-end">
										<Skeleton className="h-10 w-48" />
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar - 1/3 */}
						<div className="space-y-6">
							{/* Session skeleton */}
							<Card>
								<CardHeader>
									<div className="flex items-center gap-2">
										<Skeleton className="w-5 h-5 rounded" />
										<Skeleton className="h-5 w-20" />
									</div>
								</CardHeader>
								<CardContent>
									<Skeleton className="h-4 w-full mb-4" />
									<Skeleton className="h-10 w-full" />
								</CardContent>
							</Card>

							{/* RGPD skeleton */}
							<Card>
								<CardHeader>
									<div className="flex items-center gap-2">
										<Skeleton className="w-5 h-5 rounded" />
										<Skeleton className="h-6 w-40" />
									</div>
									<Skeleton className="h-4 w-full mt-1" />
								</CardHeader>
								<CardContent className="space-y-6">
									<div>
										<Skeleton className="h-5 w-36 mb-2" />
										<Skeleton className="h-4 w-full mb-1" />
										<Skeleton className="h-4 w-48 mb-2" />
										<Skeleton className="h-10 w-40" />
									</div>
									<Skeleton className="h-px w-full" />
									<div>
										<Skeleton className="h-5 w-32 mb-2" />
										<Skeleton className="h-4 w-full mb-1" />
										<Skeleton className="h-4 w-56 mb-4" />
										<Skeleton className="h-10 w-44" />
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
