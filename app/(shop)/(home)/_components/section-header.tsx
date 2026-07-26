import type { ReactNode } from "react";

import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { cn } from "@/shared/utils/cn";

interface SectionHeaderProps {
	titleId: string;
	title: ReactNode;
	subtitleId?: string;
	subtitle?: ReactNode;
	/**
	 * `center` (défaut) : patron historique des sections home.
	 * `left` : titre/underline/sous-titre alignés à gauche sur desktop
	 * (mobile reste centré pour la cohérence tactile), avec un slot `cta`
	 * optionnel calé en bas à droite — casse la monotonie verticale.
	 */
	align?: "center" | "left";
	/** Slot CTA desktop (align="left" uniquement) — masqué sous lg. */
	cta?: ReactNode;
	/**
	 * `false` : Fade au montage (sections near-fold comme Nouvelles créations).
	 * `true` (défaut) : Fade lié au scroll (`inView once`) pour les sections sous le fold.
	 */
	inView?: boolean;
	/** Contenu additionnel rendu dans le header après le sous-titre (ex : note agrégée). */
	children?: ReactNode;
	className?: string;
}

/**
 * Header de section home — factorise le patron Fade + SectionTitle +
 * HandDrawnUnderline + sous-titre répété sur toutes les sections.
 *
 * L'underline hérite de l'accent de section (`data-accent`, cf.
 * app/styles/section-accents.css) via son défaut `--section-accent`.
 * Les h2 home portent `weight="normal"` (vs défaut global `light`) pour
 * un vrai contraste de graisse avec le h1 hero resté light.
 */
export function SectionHeader({
	titleId,
	title,
	subtitleId,
	subtitle,
	align = "center",
	cta,
	inView = true,
	children,
	className,
}: SectionHeaderProps) {
	const isLeft = align === "left";
	const fadeInViewProps = inView ? { inView: true, once: true } : {};

	const heading = (
		<>
			<Fade
				y={MOTION_CONFIG.section.title.y}
				duration={MOTION_CONFIG.section.title.duration}
				{...fadeInViewProps}
			>
				<SectionTitle id={titleId} weight="normal" className={cn(isLeft && "lg:text-left")}>
					{title}
				</SectionTitle>
				<HandDrawnUnderline
					delay={MOTION_CONFIG.section.underline.delay}
					className={cn("mx-auto mt-2", isLeft && "lg:mx-0")}
				/>
			</Fade>
			{subtitle && (
				<Fade
					y={MOTION_CONFIG.section.subtitle.y}
					delay={MOTION_CONFIG.section.subtitle.delay}
					duration={MOTION_CONFIG.section.subtitle.duration}
					{...fadeInViewProps}
				>
					<p
						id={subtitleId}
						className={cn(
							"text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal",
							isLeft && "lg:mx-0",
						)}
					>
						{subtitle}
					</p>
				</Fade>
			)}
			{children}
		</>
	);

	if (!isLeft) {
		return <header className={cn("mb-10 text-center lg:mb-14", className)}>{heading}</header>;
	}

	return (
		<header
			className={cn(
				"mb-10 text-center lg:mb-14 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:text-left",
				className,
			)}
		>
			<div className="min-w-0">{heading}</div>
			{cta && <div className="hidden shrink-0 lg:block">{cta}</div>}
		</header>
	);
}
