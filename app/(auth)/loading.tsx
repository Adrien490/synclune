import { AuthSkeletonShell } from "@/app/(auth)/_components/auth-skeleton-shell";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de repli du groupe `(auth)`.
 *
 * ⚠️ Volontairement **neutre**. Un `loading.tsx` de groupe ne connaît pas la
 * route : il servait auparavant une forme d'inscription complète (4 champs +
 * jauge de force + case CGV) à `/connexion` aussi, provoquant l'effondrement
 * d'environ 150-170 px à l'arrivée de la page.
 *
 * Les routes à formulaire ont désormais leur propre squelette
 * (`connexion`, `inscription`, `mot-de-passe-oublie`,
 * `reinitialiser-mot-de-passe`, `renvoyer-verification`). Ce fichier ne couvre
 * plus que `/verifier-email` et `/error`, qui affichent un bloc de statut sans
 * formulaire — d'où deux lignes de texte et un seul bouton, jamais de champs.
 *
 * Ne PAS y remettre une forme de formulaire : sous-réserver est ici préférable à
 * réserver la mauvaise forme.
 */
export default function AuthLoading() {
	return (
		<AuthSkeletonShell label="Chargement">
			<div className="space-y-4">
				<Skeleton className="bg-muted/30 h-4 w-full" />
				<Skeleton className="bg-muted/30 h-4 w-3/4" />
			</div>
			<Skeleton className="bg-primary/20 h-11 w-full rounded-md" />
		</AuthSkeletonShell>
	);
}
