import { ArrowLeft, User, FileText, Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

/**
 * Loading skeleton pour la page detail personnalisation
 */
export default function CustomizationDetailLoading() {
	return (
		<>
			{/* Header skeleton */}
			<Skeleton className="mb-4 h-8 w-48" />

			<div className="mb-6">
				<Button variant="ghost" size="sm" disabled>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Retour à la liste
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Colonne principale */}
				<div className="space-y-6 lg:col-span-2">
					{/* Informations client */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<User className="h-5 w-5" />
								Informations client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<p className="text-muted-foreground text-sm">Nom complet</p>
									<Skeleton className="mt-1 h-5 w-32" />
								</div>
								<div>
									<p className="text-muted-foreground text-sm">Email</p>
									<Skeleton className="mt-1 h-5 w-48" />
								</div>
								<div>
									<p className="text-muted-foreground text-sm">Téléphone</p>
									<Skeleton className="mt-1 h-5 w-28" />
								</div>
								<div>
									<p className="text-muted-foreground text-sm">Type de produit</p>
									<Skeleton className="mt-1 h-5 w-24" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Détails du projet */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<FileText className="h-5 w-5" />
								Détails du projet
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</CardContent>
					</Card>

					{/* Inspirations */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Sparkles className="h-5 w-5" />
								Créations inspirantes
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="bg-card overflow-hidden rounded-lg border">
										<Skeleton className="aspect-square w-full" />
										<div className="p-2">
											<Skeleton className="h-4 w-24" />
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Statut */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Statut</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-7 w-24 rounded-full" />
							<Separator />
							<div className="space-y-3">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-9 w-full" />
							</div>
						</CardContent>
					</Card>

					{/* Métadonnées */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Informations</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Créée le</span>
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Mise à jour</span>
								<Skeleton className="h-4 w-24" />
							</div>
						</CardContent>
					</Card>

					{/* Actions rapides */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
