import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Squelette du suivi de commande invité.
 *
 * SSOT partagée entre `loading.tsx` (navigation vers le segment) et le
 * `<Suspense>` interne de `page.tsx` — ce dernier avait `fallback={null}`, donc
 * un `loading.tsx` seul n'aurait jamais été montré : la page est un composant
 * synchrone qui résout immédiatement, et c'est le fallback interne qui gouverne
 * l'attente réelle (lecture DB + vérification du token HMAC).
 *
 * Reproduit à l'identique les classes de `TrackingShell` (`page.tsx`) pour que
 * le passage squelette → contenu ne décale rien.
 */
export function OrderTrackingSkeleton() {
	return (
		<section className="py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:py-10">
			<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
				<SkeletonGroup label="Chargement du suivi de commande" className="space-y-6">
					{/* Titre + numéro de commande — h1 text-xl sm:text-2xl puis p text-sm */}
					<div className="space-y-1">
						<Skeleton className="h-6 w-56 sm:h-7" />
						<Skeleton className="h-4 w-40" />
					</div>

					{/* Timeline + suivi transporteur + guidance retour */}
					<Card className="border-primary/10 rounded-2xl shadow-sm">
						<CardContent className="space-y-6 p-4 sm:p-6">
							<div className="space-y-3">
								<Skeleton className="h-5 w-44" />
								<Skeleton shape="rounded" className="h-24 w-full" />
							</div>
							<div className="space-y-3">
								<Skeleton className="h-5 w-36" />
								<Skeleton className="h-4 w-full max-w-md" />
							</div>
						</CardContent>
					</Card>

					{/* Articles + récapitulatif + adresse de livraison */}
					<Card className="border-primary/10 rounded-2xl shadow-sm">
						<CardContent className="space-y-6 p-4 sm:p-6">
							<div className="space-y-4">
								{Array.from({ length: 2 }).map((_, index) => (
									<div key={index} className="flex items-start gap-4">
										<Skeleton shape="rounded" className="size-16 shrink-0" />
										<div className="min-w-0 flex-1 space-y-2">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
										<Skeleton className="h-4 w-16 shrink-0" />
									</div>
								))}
							</div>
							<div className="border-border/60 space-y-2 border-t pt-4">
								<Skeleton className="h-4 w-full max-w-xs" />
								<Skeleton className="h-4 w-full max-w-[10rem]" />
							</div>
							<div className="space-y-4">
								<Skeleton className="h-5 w-48" />
								<div className="border-border/60 space-y-1.5 border-t pt-4">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-4 w-52" />
									<Skeleton className="h-4 w-36" />
								</div>
							</div>
						</CardContent>
					</Card>
				</SkeletonGroup>
			</div>
		</section>
	);
}
