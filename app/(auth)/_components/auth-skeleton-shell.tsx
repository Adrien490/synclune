import { Skeleton } from "@/shared/components/ui/skeleton";

interface AuthSkeletonShellProps {
	/** Corps du formulaire, propre à chaque route. */
	children: React.ReactNode;
	/** Libellé annoncé + `aria-label`. */
	label: string;
	/** Réserve le sous-titre sous le `h1`. */
	hasDescription?: boolean;
}

/**
 * Chrome partagé des squelettes d'authentification — parité stricte avec
 * `modules/auth/components/auth-page-layout.tsx`.
 *
 * ## Pourquoi cette coquille existe
 *
 * `app/(auth)/loading.tsx` réservait un formulaire de forme **inscription**
 * (4 champs + jauge de force + case CGV) et servait aussi `/connexion`, qui n'a
 * que 2 champs : environ 150 à 170 px de sur-réservation s'effondraient à
 * l'arrivée de la page. Un `loading.tsx` de groupe ne peut pas connaître la route,
 * d'où une coquille partagée + un corps par route.
 *
 * ## Écarts corrigés au passage
 *
 * - Safe-area : le padding réel est
 *   `pt-[calc(4rem+env(safe-area-inset-top))] … pb-[max(2rem,env(safe-area-inset-bottom))]`
 *   (idem gauche/droite). Le squelette utilisait `px-4 pt-16 pb-8`, donc l'encoche
 *   n'était pas comptée sur iPhone.
 * - Titre : `text-2xl sm:text-3xl lg:text-4xl` → `h-8 sm:h-9 lg:h-10`, alors que le
 *   squelette réservait `h-8` à tous les breakpoints (~8 px court à `lg`).
 * - Logo : `LogoAnimated size={44}` → `size-11`, pas `size-10`.
 */
export function AuthSkeletonShell({
	children,
	label,
	hasDescription = true,
}: AuthSkeletonShellProps) {
	return (
		<div
			className="bg-background relative min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label={label}
		>
			<span className="sr-only">{label}…</span>

			{/* Lien retour */}
			<div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:left-[max(1.5rem,env(safe-area-inset-left))]">
				<Skeleton className="bg-muted/40 h-5 w-32 rounded" />
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:right-[max(1.5rem,env(safe-area-inset-right))]">
				<Skeleton className="bg-muted/40 size-11 rounded-full" />
			</div>

			<div className="relative z-10 flex min-h-dvh justify-center pt-[calc(4rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:pt-[calc(5rem+env(safe-area-inset-top))] sm:pb-[max(3rem,env(safe-area-inset-bottom))]">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header */}
					<div className="space-y-7 text-center">
						<div className="space-y-3">
							<Skeleton className="bg-muted/50 mx-auto h-8 w-64 sm:h-9 lg:h-10" />
							{hasDescription && <Skeleton className="bg-muted/30 mx-auto h-5 w-80 max-w-full" />}
						</div>
					</div>

					<div className="space-y-6">{children}</div>
				</div>
			</div>
		</div>
	);
}

/** Bouton social Google + séparateur — commun à `/connexion` et `/inscription`. */
export function AuthSocialSkeleton() {
	return (
		<>
			<div className="space-y-3">
				<Skeleton className="bg-muted/30 h-11 w-full rounded-md" />
			</div>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<Skeleton className="bg-border h-px w-full" />
				</div>
				<div className="relative flex justify-center">
					<Skeleton className="bg-background h-4 w-32 px-2" />
				</div>
			</div>
		</>
	);
}

/** Un champ : label + input (+ aide ou jauge optionnelle). */
export function AuthFieldSkeleton({
	labelWidth,
	extra,
}: {
	labelWidth: string;
	extra?: React.ReactNode;
}) {
	return (
		<div className="space-y-2">
			<Skeleton className={`bg-muted/40 h-4 ${labelWidth}`} />
			<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
			{extra}
		</div>
	);
}

/** Bouton de soumission + lien de pied de carte. */
export function AuthSubmitSkeleton({ footerWidth = "w-64" }: { footerWidth?: string }) {
	return (
		<>
			<Skeleton className="bg-primary/20 h-11 w-full rounded-md" />
			<div className="border-t pt-4 text-center">
				<Skeleton className={`bg-muted/30 mx-auto h-4 ${footerWidth}`} />
			</div>
		</>
	);
}
