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
			<Skeleton className="h-8 w-48 mb-4" />

			<div className="mb-6">
				<Button variant="ghost" size="sm" disabled>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Retour à la liste
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Colonne principale */}
				<div className="lg:col-span-2 space-y-6">
					{/* Informations client */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<User className="h-5 w-5" />
								Informations client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Nom complet</p>
									<Skeleton className="h-5 w-32 mt-1" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Email</p>
									<Skeleton className="h-5 w-48 mt-1" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Téléphone</p>
									<Skeleton className="h-5 w-28 mt-1" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Type de produit</p>
									<Skeleton className="h-5 w-24 mt-1" />
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
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="rounded-lg border bg-card overflow-hidden"
									>
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
