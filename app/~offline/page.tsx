import type { Metadata } from "next";
import { OfflineActions } from "./_components/offline-actions";

export const metadata: Metadata = {
	title: "Hors ligne",
	description: "Vous êtes actuellement hors ligne",
};

export default function OfflinePage() {
	return (
		<main
			className="relative min-h-screen bg-linear-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center px-4 overflow-hidden"
			role="alert"
			aria-live="polite"
		>
			{/* CSS-only decorative shapes */}
			<div aria-hidden="true">
				<div className="absolute top-[10%] left-[15%] size-32 rounded-full bg-primary/10 blur-2xl animate-[drift_20s_ease-in-out_infinite]" />
				<div className="absolute top-[60%] right-[10%] size-24 rounded-full bg-secondary/15 blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]" />
				<div className="absolute bottom-[15%] left-[40%] size-20 rotate-45 bg-primary/8 blur-xl animate-[drift_18s_ease-in-out_2s_infinite]" />
				<div className="absolute top-[30%] right-[30%] size-16 rounded-full bg-secondary/10 blur-2xl animate-[drift_22s_ease-in-out_4s_infinite_reverse]" />
			</div>

			<style
				dangerouslySetInnerHTML={{
					__html: `
						@keyframes drift {
							0%, 100% { transform: translate(0, 0) scale(1); }
							25% { transform: translate(30px, -20px) scale(1.05); }
							50% { transform: translate(-20px, 15px) scale(0.95); }
							75% { transform: translate(15px, 25px) scale(1.02); }
						}
						@media (prefers-reduced-motion: reduce) {
							[class*="animate-"] { animation: none !important; }
						}
					`,
				}}
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
