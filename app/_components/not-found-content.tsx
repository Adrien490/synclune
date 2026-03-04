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
				<div className="space-y-4">
					<div className="flex flex-col items-center">
						{title}
						<HandDrawnUnderline delay={0.2} />
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
