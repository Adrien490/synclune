"use client";

import { cn } from "@/shared/utils/cn";
import { useRef, useState } from "react";

interface MagneticWrapperProps {
	children: React.ReactNode;
	/** Force de l'effet magnétique (1-10) */
	strength?: number;
	className?: string;
}

/**
 * Wrapper qui ajoute un effet magnétique aux enfants.
 * L'élément suit légèrement le curseur quand il est proche.
 *
 * @example
 * ```tsx
 * <MagneticWrapper strength={3}>
 *   <Button>Hover me!</Button>
 * </MagneticWrapper>
 * ```
 */
export function MagneticWrapper({
	children,
	strength = 2,
	className,
}: MagneticWrapperProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [transform, setTransform] = useState({ x: 0, y: 0 });

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!ref.current) return;

		const rect = ref.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const deltaX = (e.clientX - centerX) / (rect.width / 2);
		const deltaY = (e.clientY - centerY) / (rect.height / 2);

		setTransform({
			x: deltaX * strength * 3,
			y: deltaY * strength * 3,
		});
	};

	const handleMouseLeave = () => {
		setTransform({ x: 0, y: 0 });
	};

	return (
		<div
			ref={ref}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			className={cn("inline-block", className)}
			style={{
				transform: `translate(${transform.x}px, ${transform.y}px)`,
				transition: transform.x === 0 && transform.y === 0
					? "transform 0.3s ease-out"
					: "transform 0.1s ease-out",
			}}
		>
			{children}
		</div>
	);
}
