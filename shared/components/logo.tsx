"use client";

import { BRAND } from "@/shared/constants/brand";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

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
	/** Override the generated aria-label (homepage/admin fallbacks otherwise). */
	ariaLabel?: string;
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
	ariaLabel,
}: LogoProps) {
	const effectiveMaxSize = sizeMd ?? size;
	// Petits logos (≤40px) → palier vignette suffit ; sinon HERO (fidélité brand).
	const effectiveQuality =
		quality ?? (effectiveMaxSize <= 40 ? IMAGE_QUALITY.THUMBNAIL : IMAGE_QUALITY.HERO);

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
		"focus-ring inline-flex items-center",
		// Touch target minimum 44px (WCAG 2.5.5) — only in icon-only mode.
		// With showText, the text itself is the affordance and the extra min-h
		// would misalign with adjacent navbar icons.
		!showText && "min-w-11 min-h-11",
		ROUNDED_CLASSES[rounded],
	);

	const logoContent = (
		<div className={cn("flex items-center gap-3", className)}>
			<div
				className={cn(
					"relative overflow-hidden",
					ROUNDED_CLASSES[rounded],
					shadow && "shadow-md transition-shadow duration-300 ease-out hover:shadow-lg",
					// Hover/active scale on the visual wrapper, not the anchor —
					// decouples from the navbar's scroll-compact transform.
					"motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
					"motion-safe:can-hover:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
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
			>
				{logoContent}
			</Link>
		);
	}

	if (href) {
		const fallbackLabel = href === "/admin" ? `${BRAND.name} - Administration` : BRAND.name;
		return (
			<Link href={href} className={linkClassName} aria-label={ariaLabel ?? fallbackLabel}>
				{logoContent}
			</Link>
		);
	}

	return logoContent;
}
