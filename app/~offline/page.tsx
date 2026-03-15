import type { Metadata } from "next";
import { CachedProducts } from "./_components/cached-products";
import { OfflineActions } from "./_components/offline-actions";

export const metadata: Metadata = {
	title: "Hors ligne",
	description: "Vous êtes actuellement hors ligne",
};

export default function OfflinePage() {
	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br px-4">
			{/* CSS-only decorative shapes */}
			<div aria-hidden="true">
				<div className="bg-primary/10 absolute top-[10%] left-[15%] size-32 rounded-full blur-2xl motion-safe:animate-[drift_20s_ease-in-out_infinite]" />
				<div className="bg-secondary/15 absolute top-[60%] right-[10%] size-24 rounded-full blur-3xl motion-safe:animate-[drift_25s_ease-in-out_infinite_reverse]" />
				<div className="bg-primary/8 absolute bottom-[15%] left-[40%] size-20 rotate-45 blur-xl motion-safe:animate-[drift_18s_ease-in-out_2s_infinite]" />
				<div className="bg-secondary/10 absolute top-[30%] right-[30%] size-16 rounded-full blur-2xl motion-safe:animate-[drift_22s_ease-in-out_4s_infinite_reverse]" />
			</div>

			<div
				className="relative z-10 mx-auto max-w-2xl space-y-8 text-center"
				role="alert"
				aria-live="polite"
			>
				<div className="space-y-4">
					<p className="mb-4 text-8xl" aria-hidden="true">
						📡
					</p>
					<h1 className="font-display text-foreground text-3xl font-medium md:text-4xl">
						Oups, vous êtes hors ligne
					</h1>
					<p className="text-muted-foreground text-lg md:text-xl">
						Pas de panique ! Vérifiez votre connexion internet et réessayez dans quelques instants.
					</p>
				</div>

				<OfflineActions />
				<CachedProducts />
			</div>
		</main>
	);
}
