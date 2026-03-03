"use client";

import { Fade } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import type { ReactNode } from "react";

interface AuthFadeInProps {
	children: ReactNode;
	delay?: number;
	className?: string;
}

export function AuthFadeIn({ children, delay = 0, className }: AuthFadeInProps) {
	return (
		<Fade delay={delay} duration={MOTION_CONFIG.duration.emphasis} y={12} className={className}>
			{children}
		</Fade>
	);
}
