"use client";
import { cn } from "@/shared/utils/cn";
import { motion } from "motion/react";
import React, { type JSX } from "react";

export type TextShimmerProps = {
	children: string;
	as?: React.ElementType;
	className?: string;
	duration?: number;
	variant?: "default" | "light";
};

function TextShimmerComponent({
	children,
	as: Component = "p",
	className,
	duration = 2,
	variant = "default",
}: TextShimmerProps) {
	const MotionComponent = motion.create(
		Component as keyof JSX.IntrinsicElements
	);

	if (variant === "light") {
		return (
			<MotionComponent className={cn("relative inline-block", className)}>
				<span className="relative inline-block">
					{children}
					<motion.span
						className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
						initial={{ left: "-100%" }}
						animate={{ left: "200%" }}
						transition={{
							repeat: Infinity,
							duration,
							ease: "linear",
						}}
						style={{
							WebkitMaskImage:
								"linear-gradient(to right, transparent, black, transparent)",
							maskImage:
								"linear-gradient(to right, transparent, black, transparent)",
						}}
					/>
				</span>
			</MotionComponent>
		);
	}

	return (
		<MotionComponent
			className={cn(
				"relative inline-block",
				"bg-linear-to-r from-primary/60 via-primary to-primary/60",
				"bg-[length:200%_100%] bg-clip-text text-transparent",
				className
			)}
			initial={{ backgroundPosition: "200% center" }}
			animate={{ backgroundPosition: "-200% center" }}
			transition={{
				repeat: Infinity,
				duration,
				ease: "linear",
			}}
		>
			{children}
		</MotionComponent>
	);
}

export const TextShimmer = React.memo(TextShimmerComponent);
