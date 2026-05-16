"use client";

import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";

const ROUNDED_CLASSES = {
	full: "rounded-full",
	lg: "rounded-lg",
	md: "rounded-md",
	none: "",
} as const;

interface LogoProps {
	size?: number;
	/** Optional larger size applied at `md` breakpoint (768px+). Avoids dual-render anti-pattern. */
	sizeMd?: number;
	href?: string;
	className?: string;
	preload?: boolean;
	quality?: number;
	sizes?: string;
	showText?: boolean;
	textClassName?: string;
	rounded?: keyof typeof ROUNDED_CLASSES;
	shadow?: boolean;
	/** View Transition name applied to the image wrapper for cross-page morphing. */
	viewTransitionName?: string;
	/** Haptic pattern triggered on tap. Defaults to `false` (nav passive vers home). */
	haptic?: HapticPattern | false;
	/** Override the generated aria-label (homepage/admin fallbacks otherwise). */
	ariaLabel?: string;
	/** Expose BRAND.tagline via native `title` attribute (desktop tooltip). */
	enableTooltip?: boolean;
}

export function Logo({
	size = 48,
	sizeMd,
	href,
	className,
	preload = false,
	quality,
	sizes,
	showText = false,
	textClassName,
	rounded = "full",
	shadow = false,
	viewTransitionName,
	haptic = false,
	ariaLabel,
	enableTooltip = false,
}: LogoProps) {
	const effectiveMaxSize = sizeMd ?? size;
	// Petits logos (≤40px) → quality 75 suffit ; sinon 90 (fidélité brand).
	const effectiveQuality = quality ?? (effectiveMaxSize <= 40 ? 75 : 90);

	// Taille du texte proportionnelle à la taille du logo (base la plus grande envisagée)
	const textSizeClass =
		effectiveMaxSize >= 64
			? "text-3xl"
			: effectiveMaxSize >= 56
				? "text-2xl"
				: effectiveMaxSize >= 48
					? "text-xl"
					: effectiveMaxSize >= 40
						? "text-lg"
						: "text-base";

	const linkClassName = cn(
		"inline-flex items-center",
		"min-w-11 min-h-11", // Touch target minimum 44px (WCAG 2.5.5)
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
		ROUNDED_CLASSES[rounded],
		"motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
		"motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
	);

	const handleTap = () => {
		if (haptic !== false) triggerHaptic(haptic);
	};

	const logoContent = (
		<div
			className={cn("inline-flex items-center gap-3", className)}
			title={enableTooltip ? BRAND.tagline : undefined}
		>
			<div
				className={cn(
					"relative overflow-hidden",
					ROUNDED_CLASSES[rounded],
					shadow && "shadow-md transition-shadow duration-300 ease-out hover:shadow-lg",
					sizeMd && "md:!h-(--logo-size-md) md:!w-(--logo-size-md)",
				)}
				style={{
					width: size,
					height: size,
					viewTransitionName,
					...(sizeMd ? ({ "--logo-size-md": `${sizeMd}px` } as React.CSSProperties) : undefined),
				}}
			>
				<Image
					src={BRAND.logo.url}
					alt={showText ? "" : BRAND.logo.alt}
					fill
					className="object-contain"
					sizes={sizes ?? (sizeMd ? `(min-width: 768px) ${sizeMd}px, ${size}px` : `${size}px`)}
					preload={preload}
					quality={effectiveQuality}
					placeholder="blur"
					blurDataURL={BRAND.logo.blurDataURL}
					aria-hidden={showText ? true : undefined}
				/>
			</div>
			{showText && (
				<span
					className={cn(
						"font-cursive",
						textSizeClass,
						"text-foreground font-normal tracking-wide",
						textClassName,
					)}
				>
					{BRAND.name}
				</span>
			)}
		</div>
	);

	if (href === "/") {
		return (
			<Link
				href={href}
				className={linkClassName}
				aria-label={ariaLabel ?? `${BRAND.name} - Accueil`}
				onClick={handleTap}
			>
				{logoContent}
			</Link>
		);
	}

	if (href) {
		const fallbackLabel = href === "/admin" ? `${BRAND.name} - Administration` : BRAND.name;
		return (
			<Link
				href={href}
				className={linkClassName}
				aria-label={ariaLabel ?? fallbackLabel}
				onClick={handleTap}
			>
				{logoContent}
			</Link>
		);
	}

	return logoContent;
}
