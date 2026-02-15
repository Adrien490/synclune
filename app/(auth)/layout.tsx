import { ParticleBackground } from "@/shared/components/animations";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="relative min-h-screen bg-background">
			<ParticleBackground
				count={5}
				shape={["pearl", "circle", "diamond"]}
				colors={[
					"var(--primary)",
					"var(--secondary)",
					"oklch(0.92 0.08 350)",
				]}
				opacity={[0.08, 0.25]}
				blur={[10, 28]}
				animationStyle="breathe"
				speed={0.7}
				depthParallax
			/>
			<main id="auth-content" role="main">
				{children}
			</main>
		</div>
	);
}
