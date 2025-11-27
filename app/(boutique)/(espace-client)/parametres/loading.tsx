import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

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
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Card 1: Profil */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded" />
								<Skeleton className="h-6 w-56" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<Skeleton className="h-10 w-32 rounded-md mt-4" />
						</CardContent>
					</Card>

					{/* Card 2: Sécurité */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded" />
								<Skeleton className="h-6 w-24" />
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-56" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<Skeleton className="h-10 w-48 rounded-md mt-4" />
						</CardContent>
					</Card>

					{/* Card 3: Session */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Skeleton className="w-5 h-5 rounded" />
								<Skeleton className="h-6 w-20" />
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-4 w-full max-w-sm mb-4" />
							<Skeleton className="h-10 w-40 rounded-md" />
						</CardContent>
					</Card>
				</div>
			</section>
		</>
	);
}
