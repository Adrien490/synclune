import { Fade } from "@/shared/components/animations/fade";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CopyButton } from "@/shared/components/copy-button";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { CBIcon, MastercardIcon, VisaIcon } from "@/shared/components/icons/payment-icons";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Logo } from "@/shared/components/logo";
import { BRAND } from "@/shared/constants/brand";
import { footerHelpNavItems, footerNavItems, legalLinks } from "@/shared/constants/navigation";
import { CONTAINER_CLASS, FOOTER_PADDING } from "@/shared/constants/spacing";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";
import { cacheLife, cacheTag } from "next/cache";
import { ManageCookiesButton } from "@/shared/components/manage-cookies-button";
import { FooterLink } from "./footer-link";
import { STATIC_PAGES_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

/**
 * Coquille partagée par le footer et son squelette.
 *
 * Elle est factorisée pour une raison précise : les deux la recopiaient, donc
 * rien n'empêchait la coquille du squelette de dériver de la vraie (audit
 * footer 2026-08-04). Le grain `.polaroid-paper` remplace le dégradé rose —
 * même papier que les cartes Atelier ; c'est un `::before` en `z-1`, d'où le
 * `z-10` du conteneur de contenu.
 */
const FOOTER_SHELL_CLASS =
	"pwa-footer polaroid-paper border-border/60 bg-background relative overflow-hidden border-t";

/**
 * Nom accessible du landmark `contentinfo`. Le squelette porte le MÊME : un
 * landmark ne doit pas changer d'identité au swap Suspense (même arbitrage que
 * `NavbarSkeleton`). Le vrai footer le rend visible aux lecteurs d'écran via
 * un `<h2 class="sr-only">` référencé en `aria-labelledby`.
 */
const FOOTER_LABEL = "Informations et liens utiles";

const COLUMN_TITLE_CLASS = "font-display text-foreground mb-4 text-lg font-normal antialiased";
const COLUMN_LINK_CLASS =
	"text-muted-foreground can-hover:hover:bg-primary/5 inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 antialiased motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]";
// `px-2` et non `px-3` : à 1280 px les 7 entrées tiennent alors sur UNE ligne à
// côté du bloc paiement (elles débordaient de ~30 px). La hauteur de cible reste
// 44 px — c'est `min-h-11` qui la porte, pas le padding horizontal.
const LEGAL_LINK_CLASS =
	"text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-sm antialiased motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]";
const SOCIAL_PASTILLE_CLASS =
	"border-border/70 text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-foreground inline-flex size-11 items-center justify-center rounded-full border motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]";

/**
 * Lightweight skeleton matching Footer's outer shell to prevent CLS during streaming.
 *
 * Les trois hauteurs sont MESURÉES (Playwright, /cgv, 2026-08-04), pas estimées —
 * le jeu précédent (990/640/480) datait d'une estimation jamais reprise depuis le
 * retrait du bloc réassurance, et sous-réservait ~226 px en mobile. Chacune couvre
 * le pire cas de sa plage, pas un point confortable au milieu :
 *
 *   < 640 px   1078 px  (identique de 320 à 390 ; 1066 à 639)
 *   640-1023   749 px   (à 768 ; 743 à 640, 701 à 1023)
 *   >= 1024    481 px   (à 1024, où le bandeau légal tient encore sur DEUX lignes —
 *                        il n'en fait plus qu'une à partir de ~1200, d'où 433 à 1280)
 *
 * Marge de ~2 % au-dessus : une réserve trop grande fait remonter le contenu (le
 * scroll ne bouge pas), une réserve trop courte le pousse vers le bas sous le doigt.
 */
export function FooterSkeleton() {
	return (
		<footer className={FOOTER_SHELL_CLASS} aria-label={FOOTER_LABEL} aria-busy="true">
			<div className={`${CONTAINER_CLASS} ${FOOTER_PADDING}`}>
				<div className="min-h-[1090px] sm:min-h-[760px] lg:min-h-[495px]" />
			</div>
		</footer>
	);
}

/**
 * Footer statique de l'application — direction « La signature ».
 *
 * Le pied de page est l'endroit où l'atelier signe : une zone de signature
 * (phrase de marque en Fraunces, « — Léane », réseaux), deux colonnes serrées,
 * puis un rail unique qui rassemble légal et paiement. Contenu entièrement
 * statique, caché au niveau composant avec le profil "reference".
 *
 * ⚠️ Rien de dérivé du TEMPS ne doit entrer ici : le scope `"use cache"` fige
 * la valeur jusqu'à 7 jours, et le tag `FOOTER` n'a aucun mutateur. C'est ce
 * qui rendait l'année du copyright fausse pendant environ une journée chaque
 * 1ᵉʳ janvier — la mention n'en porte plus (elle n'a aucune valeur juridique,
 * cf. Convention de Berne : la protection ne dépend d'aucune formalité).
 */
export async function Footer() {
	"use cache";
	cacheLife("reference");
	cacheTag(STATIC_PAGES_CACHE_TAGS.FOOTER);
	return (
		<footer
			className={FOOTER_SHELL_CLASS}
			aria-labelledby="footer-heading"
			style={{ viewTransitionName: "shop-footer" }}
		>
			{/* Titre sr-only pour hiérarchie des headings */}
			<h2 id="footer-heading" className="sr-only">
				{FOOTER_LABEL}
			</h2>

			<div className={`relative z-10 ${CONTAINER_CLASS} ${FOOTER_PADDING}`}>
				{/* Fade unique pour tout le footer. `once` / `disableOnTouch` ne sont PAS
				    passés : depuis la réécriture de <Fade> en CSS pur, l'implémentation
				    ne les lit plus (il n'y a plus d'IntersectionObserver du tout, c'est
				    `animation-timeline: view()`). Les passer donnait l'illusion d'un
				    réglage. */}
				<Fade
					y={MOTION_CONFIG.section.footer.y}
					duration={MOTION_CONFIG.section.footer.duration}
					inView
				>
					{/* Trois zones, pas quatre colonnes égales : une qui parle, deux qui listent. */}
					<div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.85fr_0.9fr] lg:gap-10">
						{/* Zone 1 : la signature de l'atelier */}
						<div className="order-1 sm:col-span-2 lg:col-span-1">
							<Logo
								href="/"
								size={40}
								sizeMd={48}
								quality={IMAGE_QUALITY.STANDARD}
								viewTransitionName="shop-logo-footer"
							/>

							{/* `text-balance` : sans lui, « Des bijoux colorés créés / avec passion »
							    coupait entre le verbe et son complément à 390 px, et l'accent
							    manuscrit tombait au milieu de la première ligne. */}
							<p className="font-display text-foreground mt-6 max-w-[17rem] text-2xl leading-[1.25] font-normal text-balance antialiased sm:text-[1.625rem]">
								Des bijoux{" "}
								<span className="relative inline-block">
									colorés
									<HandDrawnAccent
										variant="underline"
										color="var(--primary)"
										width={96}
										height={14}
										strokeWidth={2}
										delay={0.8}
										inView
										className="absolute inset-x-0 -bottom-1.5"
									/>
								</span>{" "}
								créés avec passion
							</p>

							{/* La signature de l'ancienne landing, reprise telle quelle : même
							    accent manuscrit que « colorés » (cf. docs/atelier-story.md). */}
							<p className="mt-6">
								<span className="font-cursive text-foreground relative inline-block text-2xl font-normal">
									— Léane
									<HandDrawnAccent
										variant="underline"
										color="var(--primary)"
										width={92}
										height={12}
										strokeWidth={2}
										delay={1.1}
										inView
										className="absolute inset-x-0 -bottom-1"
									/>
								</span>
							</p>

							{/* Les handles ne sont plus affichés (deux pastilles à la place) : le
							    nom accessible les porte toujours, WCAG 2.5.3 ne s'applique pas à
							    un contrôle sans texte visible. */}
							<nav aria-label="Réseaux sociaux" className="mt-6">
								{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
								<ul role="list" className="flex items-center gap-2">
									<li>
										<FooterLink
											href={BRAND.social.instagram.url}
											external
											target="_blank"
											rel="noopener noreferrer"
											className={SOCIAL_PASTILLE_CLASS}
											aria-label={`${BRAND.social.instagram.handle} — Instagram de ${BRAND.name} (nouvelle fenêtre)`}
										>
											<InstagramIcon decorative size={18} />
										</FooterLink>
									</li>
									<li>
										<FooterLink
											href={BRAND.social.tiktok.url}
											external
											target="_blank"
											rel="noopener noreferrer"
											className={SOCIAL_PASTILLE_CLASS}
											aria-label={`${BRAND.social.tiktok.handle} — TikTok de ${BRAND.name} (nouvelle fenêtre)`}
										>
											<TikTokIcon decorative size={18} />
										</FooterLink>
									</li>
								</ul>
							</nav>
						</div>

						{/* Zone 2 : navigation boutique */}
						<nav aria-labelledby="footer-nav-title" className="order-2">
							<h3 id="footer-nav-title" className={COLUMN_TITLE_CLASS}>
								La boutique
							</h3>
							{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
							<ul role="list" className="space-y-2">
								{footerNavItems.map((item) => (
									<li key={item.href}>
										<FooterLink href={item.href} className={COLUMN_LINK_CLASS}>
											{item.label}
										</FooterLink>
									</li>
								))}
							</ul>
						</nav>

						{/* Zone 3 : écrire à l'atelier */}
						<section aria-labelledby="footer-contact-title" className="order-3">
							<h3 id="footer-contact-title" className={COLUMN_TITLE_CLASS}>
								Écrire à l&apos;atelier
							</h3>
							{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
							<ul role="list" className="mb-1 space-y-2">
								{footerHelpNavItems.map((item) => (
									<li key={item.href}>
										<FooterLink href={item.href} className={COLUMN_LINK_CLASS}>
											{item.label}
										</FooterLink>
									</li>
								))}
							</ul>

							<div className="flex flex-wrap items-center gap-1">
								<FooterLink
									href={`mailto:${BRAND.contact.email}`}
									external
									className="text-foreground can-hover:hover:bg-primary/8 wrap-break-words inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 font-medium antialiased motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]"
									aria-label={`Envoyer un email à ${BRAND.name} : ${BRAND.contact.email}`}
								>
									{BRAND.contact.email}
								</FooterLink>
								<CopyButton
									text={BRAND.contact.email}
									label="Email"
									size="icon"
									className="text-muted-foreground can-hover:hover:text-foreground size-11"
								/>
							</div>

							<p className="text-muted-foreground mt-2 px-3 text-sm/6 antialiased">
								Atelier basé en {BRAND.contact.location.country}
							</p>
						</section>
					</div>

					{/* Réassurance : SSOT = HeroReassuranceBanner (sous le hero, près du point de
					    décision — Baymard). Le footer se spécialise sur la confiance
					    transactionnelle (bloc Paiement sécurisé ci-dessous), sans dupliquer
					    livraison/retours une seconde fois sur la même page. */}

					{/* Rail bas : tout ce qui n'est pas de la navigation tient sur une ligne
					    en desktop, et cesse d'empiler sept cibles pleine largeur en mobile. */}
					<div className="border-border/60 flex flex-col items-center gap-6 border-t pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
						<nav aria-label="Liens légaux" className="w-full lg:w-auto">
							{/* Deux colonnes sous `sm` : 4 rangées au lieu de 7, sans descendre
							    une seule cible sous 44 px. `gap-y` explicite — l'ancien
							    `gap-x-2` seul ne posait AUCUN espacement, ni en colonne ni
							    entre deux lignes de `flex-wrap`. */}
							{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
							<ul
								role="list"
								className="grid grid-cols-2 gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:justify-center lg:justify-start"
							>
								{legalLinks.map((link) => (
									<li key={link.href}>
										<FooterLink
											href={link.href}
											aria-label={"ariaLabel" in link ? link.ariaLabel : undefined}
											className={LEGAL_LINK_CLASS}
										>
											{link.label}
										</FooterLink>
									</li>
								))}
								<li>
									{/* Pas un FooterLink : `focus-ring` doit donc être posé ici. */}
									<ManageCookiesButton
										className={`${LEGAL_LINK_CLASS} focus-ring cursor-pointer`}
									/>
								</li>
							</ul>
						</nav>

						<section
							className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
							aria-labelledby="footer-payment-title"
						>
							<h3 id="footer-payment-title" className="sr-only">
								Paiement sécurisé
							</h3>
							<p className="text-muted-foreground flex items-center gap-2 text-sm whitespace-nowrap">
								<span>Sécurisé par</span>
								<StripeWordmark className="text-muted-foreground" />
							</p>
							{/* Pas de survol sur ces trois-là : ils ne sont pas interactifs. Le
							    StripeWordmark voisin a perdu le sien en mai pour ce motif. */}
							{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
							<ul
								role="list"
								className="text-muted-foreground flex items-center gap-4"
								aria-label="Moyens de paiement acceptés"
							>
								<li>
									<VisaIcon aria-label="Visa accepté" />
								</li>
								<li>
									<MastercardIcon aria-label="Mastercard accepté" />
								</li>
								<li>
									<CBIcon aria-label="Carte Bancaire acceptée" />
								</li>
							</ul>
						</section>
					</div>

					<p className="text-muted-foreground pt-6 text-center text-sm/6 antialiased lg:text-left">
						© {BRAND.name}. Tous droits réservés.
					</p>
				</Fade>
			</div>
		</footer>
	);
}
