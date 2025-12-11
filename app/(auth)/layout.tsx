import { DecorativeHalo } from "@/shared/components/animations/decorative-halo";
import { ParticleSystem } from "@/shared/components/animations/particle-system";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="relative min-h-screen bg-background overflow-hidden">
			{/* Background décoratif - Minimal + Halos subtils */}
			<ParticleSystem count={4} opacity={[0.08, 0.2]} className="absolute inset-0 z-0" />
			<DecorativeHalo
				size="xl"
				variant="mixed"
				className="top-[10%] right-[8%]"
				opacity="light"
				blur="xl"
				animate="none"
			/>
			<DecorativeHalo
				size="lg"
				variant="rose"
				className="bottom-[15%] left-[10%]"
				opacity="light"
				blur="lg"
				animate="none"
			/>

			{/* Skip link pour accessibilité */}
			<a
				href="#auth-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
			>
				Passer au contenu principal
			</a>
			<main id="auth-content" role="main" className="relative z-10">
				{children}
			</main>
		</div>
	);
}
