import { ParticleBackground } from "@/shared/components/animations";
import type { Metadata } from "next";
import { OfflineActions } from "./_components/offline-actions";

export const metadata: Metadata = {
	title: "Hors ligne",
	description: "Vous êtes actuellement hors ligne",
};

export default function OfflinePage() {
	return (
		<main
			className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4"
			role="alert"
			aria-live="polite"
		>
			<ParticleBackground
				count={6}
				shape={["diamond", "circle", "crescent"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
				<div className="space-y-4">
					<p className="text-8xl mb-4" aria-hidden="true">
						📡
					</p>
					<h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
						Oups, vous êtes hors ligne
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						Pas de panique ! Vérifiez votre connexion internet et réessayez dans quelques instants.
					</p>
				</div>

				<OfflineActions />
			</div>
		</main>
	);
}
