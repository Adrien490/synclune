"use client";

import { Fade, HandDrawnUnderline, ParticleBackground } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

interface StorefrontErrorLayoutProps {
	emoji: string;
	title: string;
	description: string;
	reset: () => void;
	resetLabel?: string;
	secondaryLabel: string;
	secondaryHref: string;
	digest?: string;
	showContactLink?: boolean;
}

export function StorefrontErrorLayout({
	emoji,
	title,
	description,
	reset,
	resetLabel = "Réessayer",
	secondaryLabel,
	secondaryHref,
	digest,
	showContactLink = false,
}: StorefrontErrorLayoutProps) {
	return (
		<main
			className="from-background via-primary/5 to-secondary/10 relative flex min-h-screen items-center justify-center bg-linear-to-br px-4"
			role="alert"
			aria-live="assertive"
		>
			<ParticleBackground
				count={6}
				shape={["diamond", "circle"]}
				animationStyle="drift"
				opacity={[0.15, 0.35]}
				blur={[8, 24]}
			/>
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<Fade duration={MOTION_CONFIG.duration.emphasis}>
					<p className="mb-4 text-8xl" aria-hidden="true">
						{emoji}
					</p>
				</Fade>

				<Fade delay={0.05} duration={MOTION_CONFIG.duration.emphasis}>
					<div className="space-y-4">
						<div className="flex flex-col items-center">
							<h1 className="font-display text-foreground text-3xl font-medium md:text-4xl">
								{title}
							</h1>
							<HandDrawnUnderline delay={0.2} />
						</div>
						<p className="text-muted-foreground text-lg md:text-xl">{description}</p>
					</div>
				</Fade>

				<Fade delay={0.1} duration={MOTION_CONFIG.duration.emphasis}>
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Button onClick={reset} size="lg">
							{resetLabel}
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link href={secondaryHref}>{secondaryLabel}</Link>
						</Button>
					</div>
				</Fade>

				{showContactLink && (
					<Fade delay={0.15} duration={MOTION_CONFIG.duration.emphasis}>
						<p className="text-muted-foreground text-sm">
							Besoin d'aide ?{" "}
							<a
								href="mailto:contact@synclune.fr"
								className="text-primary underline underline-offset-2"
							>
								Contactez-nous
							</a>
						</p>
					</Fade>
				)}

				{digest && <p className="text-muted-foreground/60 text-xs">Code : {digest}</p>}
			</div>
		</main>
	);
}
