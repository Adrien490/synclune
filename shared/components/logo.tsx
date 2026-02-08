import { BRAND } from "@/shared/constants/brand";
import { cn } from "@/shared/utils/cn";
import { josefinSans } from "@/shared/styles/fonts";
import Image from "next/image";
import Link from "next/link";

// Blur placeholder minimal (SVG 10x10 gris encodé en base64)
const BLUR_DATA_URL =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iYiI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMiIvPjwvZmlsdGVyPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIiBmaWx0ZXI9InVybCgjYikiLz48L3N2Zz4=";

interface LogoProps {
	size?: number;
	href?: string;
	className?: string;
	preload?: boolean;
	quality?: number;
	sizes?: string;
	showText?: boolean;
	textClassName?: string;
	imageClassName?: string;
}

export function Logo({
	size = 48,
	href,
	className,
	preload = false,
	quality = 90,
	sizes,
	showText = false,
	textClassName,
	imageClassName,
}: LogoProps) {
	// Taille du texte proportionnelle à la taille du logo
	const textSizeClass = size >= 64 ? "text-3xl" : size >= 48 ? "text-2xl" : "text-xl";

	// Classes communes pour les liens (évite la duplication)
	const linkClassName = cn(
		"inline-flex items-center",
		"min-w-11 min-h-11", // Touch target minimum 44px (WCAG)
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
		"rounded-full transition-transform duration-200",
		"hover:scale-[1.02] active:scale-95",
		"motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
	);

	const logoContent = (
		<div className={cn("inline-flex items-center gap-3", className)}>
			<div
				className={cn("relative rounded-full overflow-hidden", imageClassName)}
				style={{ width: size, height: size }}
			>
				<Image
					src={BRAND.logo.url}
					alt={showText ? "" : BRAND.logo.alt}
					fill
					className="object-cover"
					sizes={sizes || `${size}px`}
					preload={preload}
					quality={quality}
					placeholder="blur"
					blurDataURL={BLUR_DATA_URL}
					aria-hidden={showText ? true : undefined}
					itemProp="image"
				/>
			</div>
			{showText && (
				<span
					className={cn(
						josefinSans.className,
						textSizeClass,
						"font-normal text-foreground tracking-wide",
						textClassName
					)}
				>
					{BRAND.name}
				</span>
			)}
		</div>
	);

	// Homepage logo avec Schema.org Organization
	if (href === "/") {
		return (
			<div
				itemScope
				itemType="https://schema.org/Organization"
				className="inline-flex"
			>
				<Link
					href={href}
					rel="home"
					itemProp="url"
					className={linkClassName}
					aria-label={`${BRAND.name} - Accueil`}
				>
					<div itemProp="logo">{logoContent}</div>
				</Link>
				<meta itemProp="name" content={BRAND.name} />
			</div>
		);
	}

	// Autres liens (sans Schema.org)
	if (href) {
		// Génère un label accessible basé sur la destination
		const linkLabel = href === "/admin"
			? `${BRAND.name} - Administration`
			: `${BRAND.name} - Accueil`;

		return (
			<Link
				href={href}
				className={linkClassName}
				aria-label={linkLabel}
			>
				{logoContent}
			</Link>
		);
	}

	// Logo statique (sans link)
	return logoContent;
}
