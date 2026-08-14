import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Frontière Suspense implicite de `/admin/connexion` — la page lit le cookie
 * `admin_session` (runtime data) : sans ce fallback, le prérendu PPR refuse la
 * route (« runtime data during prerendering »). Même rôle que le `loading.tsx`
 * de l'ancienne `app/(auth)/connexion`.
 */
export default function AdminLoginLoading() {
	return (
		<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
			<div
				role="status"
				aria-busy="true"
				aria-label="Chargement de la page de connexion"
				className="w-full max-w-sm space-y-8"
			>
				<div className="space-y-2 text-center">
					<Skeleton shape="text" className="mx-auto h-9 w-40" />
					<Skeleton shape="text" className="mx-auto h-5 w-56" />
				</div>
				<div className="space-y-6">
					<Skeleton shape="rounded" className="h-14 w-full" />
					<Skeleton shape="rounded" className="h-10 w-full" />
				</div>
				<span className="sr-only">Chargement…</span>
			</div>
		</main>
	);
}
