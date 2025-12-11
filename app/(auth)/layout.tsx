import { ParticleSystem } from "@/shared/components/animations/particle-system";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="relative min-h-screen bg-background overflow-hidden">
			{/* Background décoratif */}
			<ParticleSystem
				count={12}
				shape={["diamond", "pearl", "sparkle-4", "drop"]}
				colors={["var(--secondary)", "oklch(0.9 0.1 80)", "var(--primary)"]}
				opacity={[0.2, 0.45]}
				blur={[6, 24]}
				size={[25, 70]}
			/>

			<main id="auth-content" role="main" className="relative z-10">
				{children}
			</main>
		</div>
	);
}
