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

			{/*
			 * ⚠️ Plus de bloc titre + sous-titre ici : il n'existait sur AUCUNE page du
			 * compte. Le `h1` et les onglets sont rendus par le layout
			 * (`_components/espace-client-content.tsx`), donc ces deux lignes étaient
			 * ~44 px de fantôme sur les trois routes.
			 *
			 * La grille `lg:grid-cols-3` ci-dessous ne correspond qu'à `/parametres`.
			 * `/commandes` et `/adresses` ont désormais leur propre `loading.tsx`, ce
			 * fichier ne sert donc plus que `/parametres` et ses sous-routes.
			 */}
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
