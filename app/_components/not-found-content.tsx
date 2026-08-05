"use client";

import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import type { ReactNode } from "react";

interface NotFoundContentProps {
	emoji: ReactNode;
	title: ReactNode;
	description: ReactNode;
	actions: ReactNode;
}

export function NotFoundContent({ emoji, title, description, actions }: NotFoundContentProps) {
	return (
		<>
			<Fade duration={MOTION_CONFIG.duration.emphasis}>{emoji}</Fade>

			<Fade delay={0.05} duration={MOTION_CONFIG.duration.emphasis}>
				<div className="space-y-4" aria-live="polite" aria-atomic="true">
					<div className="flex flex-col items-center">
						{title}
						{/* `inView={false}` : la 404 est above-fold — une timeline `view()`
					    n'y joue jamais (mesuré `progress: 1` au chargement, audit
					    2026-08-05), le trait apparaissait déjà fini. En mode load, le
					    `delay` devient réel : le trait se dessine après le titre.
					    `length="l"` : le tracé long (176×16), taillé pour un h1 —
					    l'ancien 120 px flottait sous un titre de ~310 px. */}
						<HandDrawnUnderline inView={false} delay={0.2} length="l" className="mt-1" />
					</div>
					{description}
				</div>
			</Fade>

			<Fade delay={0.1} duration={MOTION_CONFIG.duration.emphasis}>
				{actions}
			</Fade>
		</>
	);
}
