import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Frontière Suspense implicite de `/suivi-commande/avoir` — la page lit la commande en base (token HMAC ou session admin) (runtime
 * data) : sans ce fallback, le prérendu PPR refuse la route (« uncached data
 * during prerendering »). Même contrainte que `app/admin/connexion/loading.tsx`.
 */
export default function AvoirLoading() {
	return (
		<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
			<div
				role="status"
				aria-busy="true"
				aria-label="Chargement"
				className="w-full max-w-md space-y-6"
			>
				<Skeleton shape="text" className="mx-auto h-9 w-56" />
				<Skeleton shape="rounded" className="h-40 w-full" />
				<Skeleton shape="rounded" className="h-10 w-full" />
				<span className="sr-only">Chargement…</span>
			</div>
		</main>
	);
}
