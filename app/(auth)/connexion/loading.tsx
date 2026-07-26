import {
	AuthFieldSkeleton,
	AuthSkeletonShell,
	AuthSocialSkeleton,
	AuthSubmitSkeleton,
} from "@/app/(auth)/_components/auth-skeleton-shell";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de `/connexion` — forme du `SignInEmailForm` : email, mot de passe
 * (avec lien « mot de passe oublié »), soumission.
 *
 * Route la plus visitée du groupe `(auth)`, et celle qui souffrait le plus du
 * squelette de groupe en forme d'inscription : deux groupes de champs et une case
 * à cocher réservés pour rien.
 */
export default function SignInLoading() {
	return (
		<AuthSkeletonShell label="Chargement de la connexion">
			<AuthSocialSkeleton />

			<div className="space-y-4">
				<AuthFieldSkeleton labelWidth="w-12" />
				<AuthFieldSkeleton
					labelWidth="w-28"
					extra={<Skeleton className="bg-muted/20 ml-auto h-3 w-40" />}
				/>
			</div>

			<AuthSubmitSkeleton />
		</AuthSkeletonShell>
	);
}
