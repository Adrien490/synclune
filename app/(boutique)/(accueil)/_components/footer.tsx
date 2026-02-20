import { Fade } from "@/shared/components/animations/fade";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import {
	ApplePayIcon,
	CBIcon,
	MastercardIcon,
	PayPalIcon,
	VisaIcon,
} from "@/shared/components/icons/payment-icons";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Logo } from "@/shared/components/logo";
import { BRAND } from "@/shared/constants/brand";
import { footerNavItems, legalLinks } from "@/shared/constants/navigation";
import { FOOTER_PADDING } from "@/shared/constants/spacing";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { CopyrightYear } from "./copyright-year";

const REASSURANCE_ITEMS: { title: string; description: string }[] = [
	{ title: "Livraison France : 6€", description: "Expédition sous 2-3 jours" },
	{ title: "Retours sous 14 jours", description: "Échange ou remboursement" },
	{ title: "Paiement sécurisé", description: "CB, PayPal, Apple Pay" },
];

/**
 * Footer statique de l'application
 *
 * Contenu entierement statique (navigation, liens, contact).
 * Cache au niveau composant avec profil "reference" (7j stale, 24h revalidate).
 */
export async function Footer() {
	"use cache";
	cacheLife("reference");
	cacheTag("footer");
	return (
		<footer
			className="relative bg-gradient-to-b from-muted/20 via-background to-background overflow-hidden"
			aria-label="Informations de contact et navigation du site"
		>
			{/* Titre sr-only pour hiérarchie des headings */}
			<h2 className="sr-only">Informations et liens utiles</h2>

			{/* Masque flou en haut pour transition douce (réduit sur mobile) */}
			<div
				className="absolute top-0 left-0 right-0 h-6 sm:h-12 bg-linear-to-b from-background to-transparent pointer-events-none"
				aria-hidden="true"
			/>

			<div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${FOOTER_PADDING}`}>
				{/* Single Fade wrapper — 1 IntersectionObserver instead of 4 */}
				<Fade y={MOTION_CONFIG.section.footer.y} duration={MOTION_CONFIG.section.footer.duration} inView once disableOnTouch>
					{/* Navigation principale - Ordre: Logo, Navigation, Contact, Réseaux */}
					<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-8">
						{/* Colonne 1: Logo + phrase perso */}
						<div className="order-1 space-y-4">
							<div className="mb-4">
								<Logo href="/" size={40} className="lg:[&_>_div]:size-12" />
							</div>
							<div className="space-y-2 max-w-xs">
								<p className="text-sm/6 antialiased text-muted-foreground">
									<span className="relative inline-block font-medium text-foreground">
										Des bijoux{" "}
										<span className="text-foreground">
											colorés
										</span>
										<HandDrawnAccent
											variant="underline"
											color="currentColor"
											width={60}
											height={12}
											strokeWidth={1.5}
											delay={0.8}
											className="absolute -bottom-1 left-[4.5ch]"
										/>
									</span>
									<br />
									créés avec passion
								</p>
							</div>
						</div>

						{/* Colonne 2: Navigation */}
						<nav aria-labelledby="footer-nav-title" className="order-2">
							<h3
								id="footer-nav-title"
								className="text-base/6 font-medium antialiased text-foreground mb-4"
							>
								Navigation
							</h3>
							<ul className="space-y-2">
								{footerNavItems.map((item) => (
									<li key={item.href}>
										<Link
											href={item.href}
											className="text-sm/6 antialiased text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-lg inline-flex items-center px-3 py-2 min-h-11"
										>
											{item.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>

						{/* Colonne 3: Contact */}
						<div className="order-3">
							<h3 className="text-base/6 font-medium antialiased text-foreground mb-4">
								Contact
							</h3>
							<div className="space-y-3">
								{/* Email - CTA principal avec style proéminent */}
								<a
									href={`mailto:${BRAND.contact.email}`}
									className="inline-flex items-center px-3 py-2 min-h-11 text-sm/6 antialiased font-medium text-foreground hover:bg-accent rounded-lg transition-colors duration-200 wrap-break-words focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
									aria-label={`Envoyer un email à Synclune : ${BRAND.contact.email}`}
								>
									{BRAND.contact.email}
								</a>

								<p className="text-sm/6 antialiased text-muted-foreground px-3">
									Atelier basé à Nantes, Loire-Atlantique, France
								</p>
							</div>
						</div>

						{/* Colonne 4: Réseaux sociaux */}
						<nav
							aria-labelledby="footer-social-title"
							className="order-4"
						>
							<h3
								id="footer-social-title"
								className="text-base/6 font-medium antialiased text-foreground mb-4"
							>
								Réseaux sociaux
							</h3>
							<ul className="space-y-2">
								<li>
									<a
										href={BRAND.social.instagram.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-all duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
										aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
									>
										<InstagramIcon
											decorative
											size={20}
											className="text-foreground transition-transform duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_var(--color-glow-pink)]"
										/>
										<span className="text-sm/6 font-medium antialiased text-foreground">
											{BRAND.social.instagram.handle}
										</span>
									</a>
								</li>
								<li>
									<a
										href={BRAND.social.tiktok.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-all duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
										aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
									>
										<TikTokIcon
											decorative
											size={20}
											className="text-foreground transition-transform duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_var(--color-glow-mint)]"
										/>
										<span className="text-sm/6 font-medium antialiased text-foreground">
											{BRAND.social.tiktok.handle}
										</span>
									</a>
								</li>
							</ul>
						</nav>
					</div>

					{/* Reassurance - Baymard UX trust signals */}
					<section aria-label="Engagements et garanties" className="mb-8">
						<ul className="grid sm:grid-cols-3 gap-3">
							{REASSURANCE_ITEMS.map((item) => (
								<li key={item.title} className="flex items-center rounded-xl bg-card/50 border border-border/60 px-5 py-4 shadow-sm">
									<div className="text-sm">
										<p className="font-medium text-foreground">{item.title}</p>
										<p className="text-muted-foreground">{item.description}</p>
									</div>
								</li>
							))}
						</ul>
					</section>

					{/* Paiement sécurisé */}
					<section className="flex flex-col items-center gap-3 pt-8 border-t border-border" aria-labelledby="footer-payment-title">
						<h3 id="footer-payment-title" className="sr-only">Paiement sécurisé</h3>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span>Sécurisé par</span>
							<StripeWordmark className="text-muted-foreground hover:text-foreground transition-colors duration-200" />
						</div>
						<ul className="flex items-center gap-4" aria-label="Moyens de paiement acceptés">
							<li><VisaIcon aria-label="Visa accepté" className="text-muted-foreground" /></li>
							<li><MastercardIcon aria-label="Mastercard accepté" className="text-muted-foreground" /></li>
							<li><CBIcon aria-label="Carte Bancaire acceptée" className="text-muted-foreground" /></li>
							<li><PayPalIcon aria-label="PayPal accepté" className="text-muted-foreground" /></li>
							<li><ApplePayIcon aria-label="Apple Pay accepté" className="text-muted-foreground" /></li>
						</ul>
					</section>

					{/* Copyright + Liens légaux */}
					<div className="flex flex-col items-center gap-4 pt-6">
						<p className="text-sm/6 antialiased text-muted-foreground text-center">
							© <CopyrightYear /> Synclune. Tous droits réservés.
						</p>
						<nav
							aria-label="Liens légaux"
							className="flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-x-2"
						>
							{legalLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									title={"title" in link ? link.title : undefined}
									className="text-sm antialiased text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-lg px-3 py-2 min-h-11 inline-flex items-center justify-center sm:justify-start"
								>
									{link.label}
								</Link>
							))}
						</nav>
					</div>
				</Fade>
			</div>
		</footer>
	);
}
