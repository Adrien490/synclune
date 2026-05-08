import { Fade, HandDrawnUnderline, Reveal } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { PlaceholderImage } from "@/shared/components/placeholder-image";
import { SectionTitle } from "@/shared/components/section-title";
import { BRAND } from "@/shared/constants/brand";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";

import { InstagramFollowButton } from "./instagram-follow-button";

const HIGHLIGHTS = [
	"Nouvelles créations en avant-première",
	"Coulisses et work in progress de l'atelier",
] as const;

export function InstagramTeaser() {
	return (
		<section
			id="instagram-teaser"
			aria-labelledby="instagram-teaser-title"
			aria-describedby="instagram-teaser-subtitle"
			className={cn(
				"bg-background relative overflow-hidden",
				"mask-t-from-95% mask-t-to-100% mask-b-from-95% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-90%",
				SECTION_SPACING.section,
			)}
			style={{ viewTransitionName: "instagram-teaser" }}
		>
			<div className={CONTAINER_CLASS}>
				<div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
					{/* Visual side — atelier preview with Instagram handle badge */}
					<Reveal
						y={MOTION_CONFIG.section.content.y}
						delay={MOTION_CONFIG.section.content.delay}
						duration={MOTION_CONFIG.section.content.duration}
						once
					>
						<div className="relative mx-auto w-full max-w-md lg:max-w-none">
							<div className="relative shadow-md">
								<PlaceholderImage
									className="aspect-[4/5] rounded-2xl sm:aspect-[5/6]"
									label="Aperçu de la galerie Instagram @synclune.bijoux : pièces colorées et détails d'atelier"
								/>
								{/* Soft bottom gradient for handle badge readability */}
								<div
									aria-hidden="true"
									className="from-foreground/40 via-foreground/10 absolute inset-x-0 bottom-0 h-1/3 rounded-b-2xl bg-linear-to-t to-transparent"
								/>
								<div
									aria-hidden="true"
									className="bg-background/95 text-foreground absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur"
								>
									<InstagramIcon decorative size={16} />
									{BRAND.social.instagram.handle}
								</div>
							</div>
						</div>
					</Reveal>

					{/* Editorial side */}
					<div className="flex flex-col gap-5 text-center lg:text-left">
						<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
							<div className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
								<InstagramIcon decorative size={14} />
								<span>Sur Instagram</span>
							</div>
							<SectionTitle id="instagram-teaser-title" align="left" className="mt-3 lg:text-left">
								Suivez l&apos;atelier au quotidien
							</SectionTitle>
							<HandDrawnUnderline
								color="var(--secondary)"
								delay={MOTION_CONFIG.section.underline.delay}
								className="mx-auto mt-2 lg:mx-0"
							/>
						</Fade>

						<Fade
							y={MOTION_CONFIG.section.subtitle.y}
							delay={MOTION_CONFIG.section.subtitle.delay}
							duration={MOTION_CONFIG.section.subtitle.duration}
						>
							<p
								id="instagram-teaser-subtitle"
								className="text-muted-foreground text-base leading-relaxed sm:text-lg"
							>
								Les coulisses, les essais ratés, les couleurs du jour, les pièces qui partent en
								exclusivité : tout commence sur Instagram avant d&apos;arriver ici.
							</p>
						</Fade>

						<Fade
							y={MOTION_CONFIG.section.subtitle.y}
							delay={MOTION_CONFIG.section.subtitle.delay + 0.1}
							duration={MOTION_CONFIG.section.subtitle.duration}
						>
							<ul className="text-foreground marker:text-primary/70 mx-auto list-disc space-y-2 pl-5 text-left text-sm sm:text-base lg:mx-0">
								{HIGHLIGHTS.map((label) => (
									<li key={label}>{label}</li>
								))}
							</ul>
						</Fade>

						<Fade
							y={MOTION_CONFIG.section.cta.y}
							delay={MOTION_CONFIG.section.cta.delay}
							duration={MOTION_CONFIG.section.cta.duration}
							inView
							once
							className="mx-auto lg:mx-0"
						>
							<InstagramFollowButton />
						</Fade>
					</div>
				</div>
			</div>
		</section>
	);
}
