"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Sparkle {
	id: number;
	x: number;
	y: number;
	size: number;
	color: string;
	rotation: number;
}

interface LogoSparklesProps {
	children: React.ReactNode;
	className?: string;
}

const SPARKLE_COLORS = [
	"oklch(0.85 0.12 350)",  // Rose
	"oklch(0.82 0.10 300)",  // Lavande
	"oklch(0.88 0.10 80)",   // Doré
	"oklch(0.85 0.08 160)",  // Menthe
];

/**
 * Wrapper pour le logo qui ajoute un easter egg:
 * explosion de sparkles au clic.
 */
export function LogoSparkles({ children, className }: LogoSparklesProps) {
	const [sparkles, setSparkles] = useState<Sparkle[]>([]);
	const [mounted, setMounted] = useState(false);

	const handleClick = (e: React.MouseEvent) => {
		// Récupérer la position du clic
		const rect = e.currentTarget.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		// Créer 12 sparkles
		const count = 12;
		const newSparkles: Sparkle[] = Array.from({ length: count }, (_, i) => ({
			id: Date.now() + i,
			x: centerX,
			y: centerY,
			size: 10 + Math.random() * 10,
			color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
			rotation: Math.random() * 360,
		}));

		setSparkles(newSparkles);
		setMounted(true);

		// Animer les sparkles
		let frame = 0;
		const maxFrames = 40;

		const animate = () => {
			frame++;
			if (frame >= maxFrames) {
				setSparkles([]);
				return;
			}

			const progress = frame / maxFrames;

			setSparkles(prev =>
				prev.map((sparkle, i) => {
					const angle = (i / count) * Math.PI * 2;
					const radius = 60 * (1 - Math.pow(1 - progress, 2));
					return {
						...sparkle,
						x: centerX + Math.cos(angle) * radius,
						y: centerY + Math.sin(angle) * radius - 30 * progress,
					};
				})
			);

			requestAnimationFrame(animate);
		};

		requestAnimationFrame(animate);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick(e as unknown as React.MouseEvent);
		}
	};

	return (
		<>
			<div
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				aria-label="Déclencher l'animation sparkles"
				className={className}
			>
				{children}
			</div>

			{mounted && sparkles.length > 0 && createPortal(
				<div className="fixed inset-0 pointer-events-none z-[9999]" aria-hidden="true">
					{sparkles.map((sparkle, i) => (
						<div
							key={sparkle.id}
							className="absolute"
							style={{
								left: sparkle.x,
								top: sparkle.y,
								transform: `translate(-50%, -50%) rotate(${sparkle.rotation}deg)`,
								opacity: 1 - (i / sparkles.length) * 0.5,
							}}
						>
							<svg
								width={sparkle.size}
								height={sparkle.size}
								viewBox="0 0 24 24"
								fill={sparkle.color}
							>
								<path d="M12 2L13.09 8.26L18 6L14.74 11.09L21 12L14.74 12.91L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 12.91L3 12L9.26 11.09L6 6L10.91 8.26L12 2Z"/>
							</svg>
						</div>
					))}
				</div>,
				document.body
			)}
		</>
	);
}
