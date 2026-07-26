import {
	AuthFieldSkeleton,
	AuthSkeletonShell,
	AuthSocialSkeleton,
	AuthSubmitSkeleton,
} from "@/app/(auth)/_components/auth-skeleton-shell";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de `/inscription` — forme du `SignUpEmailForm` :
 * nom, email (+ aide), mot de passe (+ jauge de force), confirmation, case CGV.
 *
 * Cette forme vivait dans `app/(auth)/loading.tsx` et servait donc AUSSI
 * `/connexion` (2 champs seulement), d'où ~150-170 px de sur-réservation qui
 * s'effondraient au rendu.
 */
export default function SignUpLoading() {
	return (
		<AuthSkeletonShell label="Chargement de l'inscription">
			<AuthSocialSkeleton />

			<div className="space-y-4">
				<AuthFieldSkeleton labelWidth="w-16" />
				<AuthFieldSkeleton
					labelWidth="w-12"
					extra={<Skeleton className="bg-muted/20 h-3 w-80 max-w-full" />}
				/>
				<AuthFieldSkeleton
					labelWidth="w-28"
					extra={<Skeleton className="bg-muted/20 h-1.5 w-full rounded-full" />}
				/>
				<AuthFieldSkeleton labelWidth="w-44" />
			</div>

			{/* Case à cocher CGV */}
			<div className="flex items-center gap-2">
				<Skeleton className="bg-muted/40 size-4 rounded" />
				<Skeleton className="bg-muted/30 h-4 w-72 max-w-full" />
			</div>

			<AuthSubmitSkeleton />
		</AuthSkeletonShell>
	);
}
