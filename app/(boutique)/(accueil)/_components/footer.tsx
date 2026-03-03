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
import { CONTAINER_CLASS, FOOTER_PADDING } from "@/shared/constants/spacing";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

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
			className="pwa-footer from-muted/20 via-background to-background relative overflow-hidden bg-linear-to-b"
			aria-labelledby="footer-heading"
		>
			{/* Titre sr-only pour hiérarchie des headings */}
			<h2 id="footer-heading" className="sr-only">
				Informations et liens utiles
			</h2>

			{/* Masque flou en haut pour transition douce (réduit sur mobile) */}
			<div
				className="from-background pointer-events-none absolute top-0 right-0 left-0 h-6 bg-linear-to-b to-transparent sm:h-12"
				aria-hidden="true"
			/>

			<div className={`relative z-10 ${CONTAINER_CLASS} ${FOOTER_PADDING}`}>
				{/* Single Fade wrapper — 1 IntersectionObserver instead of 4 */}
				<Fade
					y={MOTION_CONFIG.section.footer.y}
					duration={MOTION_CONFIG.section.footer.duration}
					inView
					once
					disableOnTouch
				>
					{/* Navigation principale - Ordre: Logo, Navigation, Contact, Réseaux */}
					<div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
						{/* Colonne 1: Logo + phrase perso */}
						<div className="order-1 space-y-4">
							<div className="mb-4">
								<Logo href="/" size={40} quality={75} className="lg:[&_>_div]:size-12" />
							</div>
							<div className="max-w-xs space-y-2">
								<p className="text-muted-foreground text-sm/6 antialiased">
									<span className="text-foreground relative inline-block font-medium">
										Des bijoux <span className="text-foreground">colorés</span>
										<HandDrawnAccent
											variant="underline"
											color="currentColor"
											width={60}
											height={12}
											strokeWidth={1.5}
											delay={0.8}
											inView={false}
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
								className="text-foreground mb-4 text-base/6 font-medium antialiased"
							>
								Navigation
							</h3>
							<ul className="space-y-2">
								{footerNavItems.map((item) => (
									<li key={item.href}>
										<Link
											href={item.href}
											className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 antialiased transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
										>
											{item.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>

						{/* Colonne 3: Contact */}
						<section aria-labelledby="footer-contact-title" className="order-3">
							<h3
								id="footer-contact-title"
								className="text-foreground mb-4 text-base/6 font-medium antialiased"
							>
								Contact
							</h3>
							<div className="space-y-3">
								{/* Email - CTA principal avec style proéminent */}
								<a
									href={`mailto:${BRAND.contact.email}`}
									className="text-foreground hover:bg-accent wrap-break-words focus-visible:outline-ring inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 font-medium antialiased transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
									aria-label={`Envoyer un email à ${BRAND.name} : ${BRAND.contact.email}`}
								>
									{BRAND.contact.email}
								</a>

								<p className="text-muted-foreground px-3 text-sm/6 antialiased">
									Atelier basé en {BRAND.contact.location.country}
								</p>
							</div>
						</section>

						{/* Colonne 4: Réseaux sociaux */}
						<nav aria-labelledby="footer-social-title" className="order-4">
							<h3
								id="footer-social-title"
								className="text-foreground mb-4 text-base/6 font-medium antialiased"
							>
								Réseaux sociaux
							</h3>
							<ul className="space-y-2">
								<li>
									<a
										href={BRAND.social.instagram.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group hover:bg-accent focus-visible:outline-ring inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
										aria-label={`Suivre ${BRAND.name} sur Instagram (nouvelle fenêtre)`}
									>
										<InstagramIcon
											decorative
											size={20}
											className="text-foreground transition-transform duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_var(--color-glow-pink)]"
										/>
										<span className="text-foreground text-sm/6 font-medium antialiased">
											{BRAND.social.instagram.handle}
										</span>
									</a>
								</li>
								<li>
									<a
										href={BRAND.social.tiktok.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group hover:bg-accent focus-visible:outline-ring inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
										aria-label={`Suivre ${BRAND.name} sur TikTok (nouvelle fenêtre)`}
									>
										<TikTokIcon
											decorative
											size={20}
											className="text-foreground transition-transform duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_var(--color-glow-mint)]"
										/>
										<span className="text-foreground text-sm/6 font-medium antialiased">
											{BRAND.social.tiktok.handle}
										</span>
									</a>
								</li>
							</ul>
						</nav>
					</div>

					{/* Reassurance - Baymard UX trust signals */}
					<section aria-label="Engagements et garanties" className="mb-8">
						<ul className="grid gap-3 sm:grid-cols-3">
							{REASSURANCE_ITEMS.map((item) => (
								<li
									key={item.title}
									className="bg-card/50 border-border/60 flex items-center rounded-xl border px-5 py-4 shadow-sm"
								>
									<div className="text-sm">
										<p className="text-foreground font-medium">{item.title}</p>
										<p className="text-muted-foreground">{item.description}</p>
									</div>
								</li>
							))}
						</ul>
					</section>

					{/* Paiement sécurisé */}
					<section
						className="border-border flex flex-col items-center gap-3 border-t pt-8"
						aria-labelledby="footer-payment-title"
					>
						<h3 id="footer-payment-title" className="sr-only">
							Paiement sécurisé
						</h3>
						<p className="text-muted-foreground flex items-center gap-2 text-sm">
							<span>Sécurisé par</span>
							<StripeWordmark className="text-muted-foreground hover:text-foreground transition-colors duration-200" />
						</p>
						<ul className="flex items-center gap-4" aria-label="Moyens de paiement acceptés">
							<li>
								<VisaIcon aria-label="Visa accepté" className="text-muted-foreground" />
							</li>
							<li>
								<MastercardIcon aria-label="Mastercard accepté" className="text-muted-foreground" />
							</li>
							<li>
								<CBIcon aria-label="Carte Bancaire acceptée" className="text-muted-foreground" />
							</li>
							<li>
								<PayPalIcon aria-label="PayPal accepté" className="text-muted-foreground" />
							</li>
							<li>
								<ApplePayIcon aria-label="Apple Pay accepté" className="text-muted-foreground" />
							</li>
						</ul>
					</section>

					{/* Copyright + Liens légaux */}
					<div className="flex flex-col items-center gap-4 pt-6">
						<p className="text-muted-foreground text-center text-sm/6 antialiased">
							© {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.
						</p>
						<nav
							aria-label="Liens légaux"
							className="flex flex-col items-center justify-center gap-x-2 sm:flex-row sm:flex-wrap"
						>
							{legalLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									aria-label={"ariaLabel" in link ? link.ariaLabel : undefined}
									className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm antialiased transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 sm:justify-start"
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
