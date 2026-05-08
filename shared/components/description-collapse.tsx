"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

interface DescriptionCollapseProps {
	text: string;
	lines?: number;
	className?: string;
}

export function DescriptionCollapse({ text, lines = 8, className }: DescriptionCollapseProps) {
	const haptic = useHaptic();
	const paragraphRef = useRef<HTMLParagraphElement | null>(null);
	const [expanded, setExpanded] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const id = useId();

	useEffect(() => {
		const node = paragraphRef.current;
		if (!node) return;
		const measure = () => {
			const overflow = node.scrollHeight - node.clientHeight > 1;
			setIsOverflowing(overflow);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [text]);

	const clampStyle = expanded
		? undefined
		: ({
				display: "-webkit-box",
				WebkitBoxOrient: "vertical",
				WebkitLineClamp: lines,
				overflow: "hidden",
			} as const);

	return (
		<div className={`space-y-2 ${className ?? ""}`}>
			<p
				ref={paragraphRef}
				id={id}
				style={clampStyle}
				className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap"
			>
				{text}
			</p>
			{(isOverflowing || expanded) && (
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto px-0"
					aria-expanded={expanded}
					aria-controls={id}
					onClick={() => {
						haptic("light");
						setExpanded((prev) => !prev);
					}}
				>
					{expanded ? "Voir moins" : "Voir plus"}
				</Button>
			)}
		</div>
	);
}
