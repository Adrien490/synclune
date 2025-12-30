"use client";

import { cn } from "@/shared/utils/cn";
import { motion } from "motion/react";
import { bgColorClass, loaderAnimations, sizeClasses } from "./constants";
import { MiniDotsLoaderProps } from "./types";

export function MiniDotsLoader({
	size = "sm",
	color = "primary",
	className,
}: MiniDotsLoaderProps) {
	return (
		<motion.div
			role="status"
			aria-label="Chargement en cours"
			className={cn("inline-flex gap-0.5", className)}
			variants={loaderAnimations.container}
			initial="initial"
			animate="animate"
		>
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					variants={loaderAnimations.dot}
					className={cn(
						"inline-block rounded-full",
						sizeClasses.dots[size],
						bgColorClass[color]
					)}
					transition={{
						duration: 0.6,
						repeat: Infinity,
						ease: "easeInOut",
						delay: i * 0.1,
						repeatDelay: 0.1,
					}}
				/>
			))}
		</motion.div>
	);
}
