"use client";

import { motion } from "framer-motion";
import { ANIMATION_PRESETS } from "./constants";
import type { ParticleSetProps } from "./types";
import {
	getMultiLayerGlow,
	getShapeStyles,
	getSvgConfig,
	getTransition,
	isSvgShape,
} from "./utils";

/**
 * Composant interne pour rendre un ensemble de particules
 * Gère à la fois le rendu statique (reduced motion) et animé
 * Chaque particule peut avoir sa propre forme (support multi-formes)
 * Supporte les formes SVG et les gradients
 */
export const ParticleSet = ({
	particles,
	isInView,
	reducedMotion,
	animationStyle,
	rotation,
	intensity,
	glow,
	glowIntensity,
	springPhysics,
	gradient,
}: ParticleSetProps) => {
	if (!isInView) return null;

	if (reducedMotion) {
		return (
			<>
				{particles.map((p) => {
					const isSvg = isSvgShape(p.shape);
					const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
					const shapeStyles = getShapeStyles(p.shape, p.size, p.color, gradient);

					if (isSvg && svgConfig) {
						return (
							<span
								key={p.id}
								className="absolute"
								style={{
									width: p.size,
									height: p.size,
									left: `${p.x}%`,
									top: `${p.y}%`,
									opacity: p.opacity,
									filter: `blur(${p.blur}px)`,
								}}
							>
								<svg
									viewBox={svgConfig.viewBox}
									className="w-full h-full"
									fill={p.color}
								>
									<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
								</svg>
							</span>
						);
					}

					return (
						<span
							key={p.id}
							className="absolute"
							style={{
								width: p.size,
								height: p.size,
								left: `${p.x}%`,
								top: `${p.y}%`,
								opacity: p.opacity,
								filter: `blur(${p.blur}px)`,
								...shapeStyles,
							}}
						/>
					);
				})}
			</>
		);
	}

	return (
		<>
			{particles.map((p) => {
				const isSvg = isSvgShape(p.shape);
				const svgConfig = isSvg ? getSvgConfig(p.shape) : null;
				const shapeStyles = getShapeStyles(p.shape, p.size, p.color, gradient);
				const animation = ANIMATION_PRESETS[animationStyle](p, intensity, rotation);
				const transition = getTransition(p, springPhysics);

				// Glow multi-couches optimisé
				const glowStyle = glow
					? getMultiLayerGlow(p.color, p.size, glowIntensity)
					: {};

				if (isSvg && svgConfig) {
					return (
						<motion.span
							key={p.id}
							className="absolute will-change-[transform,opacity]"
							style={{
								width: p.size,
								height: p.size,
								left: `${p.x}%`,
								top: `${p.y}%`,
								opacity: p.opacity,
								filter: `blur(${p.blur}px)`,
								transform: "translateZ(0)",
							}}
							animate={animation}
							transition={transition}
						>
							<svg
								viewBox={svgConfig.viewBox}
								className="w-full h-full"
								fill={p.color}
								style={glowStyle}
							>
								<path d={svgConfig.path} fillRule={svgConfig.fillRule} />
							</svg>
						</motion.span>
					);
				}

				return (
					<motion.span
						key={p.id}
						className="absolute will-change-[transform,opacity]"
						style={{
							width: p.size,
							height: p.size,
							left: `${p.x}%`,
							top: `${p.y}%`,
							filter: `blur(${p.blur}px)`,
							transform: "translateZ(0)",
							...shapeStyles,
							...glowStyle,
						}}
						animate={animation}
						transition={transition}
					/>
				);
			})}
		</>
	);
};
