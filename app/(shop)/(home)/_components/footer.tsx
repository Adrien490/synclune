import { Fade } from "@/shared/components/animations/fade";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CopyButton } from "@/shared/components/copy-button";
import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { CBIcon, MastercardIcon, VisaIcon } from "@/shared/components/icons/payment-icons";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Logo } from "@/shared/components/logo";
import { BRAND } from "@/shared/constants/brand";
import { footerNavItems, legalLinks } from "@/shared/constants/navigation";
import { CONTAINER_CLASS, FOOTER_PADDING } from "@/shared/constants/spacing";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";
import { formatShippingPrice } from "@/modules/orders/services/shipping.service";
import { cacheLife, cacheTag } from "next/cache";
import { FooterLink } from "./footer-link";
import { ManageCookiesButton } from "./manage-cookies-button";

const REASSURANCE_ITEMS: { title: string; description: string }[] = [
	{
		title: `Livraison France : ${formatShippingPrice(SHIPPING_RATES.FR.amount)}`,
		description: `Livraison UE : ${formatShippingPrice(SHIPPING_RATES.EU.amount)}`,
	},
	{ title: "Retours sous 14 jours", description: "Échange ou remboursement" },
	{ title: "Paiement sécurisé", description: "CB, Visa, Mastercard" },
];

/**
 * Lightweight skeleton matching Footer's outer shell to prevent CLS during streaming.
 */
export function FooterSkeleton() {
	return (
		<footer
			className="pwa-footer from-muted/20 via-background to-background relative overflow-hidden bg-linear-to-b"
			aria-hidden="true"
		>
			<div className={`${CONTAINER_CLASS} ${FOOTER_PADDING}`}>
				<div className="min-h-[400px] sm:min-h-[350px]" />
			</div>
		</footer>
	);
}

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
			style={{ viewTransitionName: "shop-footer" }}
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
					<div className="mb-8 grid gap-8 sm:mb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
						{/* Colonne 1: Logo + phrase perso */}
						<div className="order-1 space-y-4">
							<div className="mb-4">
								<Logo
									href="/"
									size={40}
									quality={75}
									className="lg:[&_>_div]:size-12"
									viewTransitionName="shop-logo-footer"
								/>
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
											inView
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
										<FooterLink
											href={item.href}
											haptic="selection"
											className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 antialiased focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]"
										>
											{item.label}
										</FooterLink>
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
								<div className="flex flex-wrap items-center gap-1">
									<FooterLink
										href={`mailto:${BRAND.contact.email}`}
										external
										haptic="light"
										className="text-foreground hover:bg-accent wrap-break-words focus-visible:outline-ring inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 font-medium antialiased focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]"
										aria-label={`Envoyer un email à ${BRAND.name} : ${BRAND.contact.email}`}
									>
										{BRAND.contact.email}
									</FooterLink>
									<CopyButton
										text={BRAND.contact.email}
										label="Email"
										size="icon"
										className="text-muted-foreground hover:text-foreground size-9"
									/>
								</div>

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
									<FooterLink
										href={BRAND.social.instagram.url}
										external
										target="_blank"
										rel="noopener noreferrer"
										haptic="light"
										className="group hover:bg-accent focus-visible:outline-ring inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]"
										aria-label={`Suivre ${BRAND.name} sur Instagram (nouvelle fenêtre)`}
									>
										<InstagramIcon
											decorative
											size={20}
											className="text-foreground group-hover:drop-shadow-[0_0_6px_var(--color-glow-pink)] motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:scale-110"
										/>
										<span className="text-foreground text-sm/6 font-medium antialiased">
											{BRAND.social.instagram.handle}
										</span>
									</FooterLink>
								</li>
								<li>
									<FooterLink
										href={BRAND.social.tiktok.url}
										external
										target="_blank"
										rel="noopener noreferrer"
										haptic="light"
										className="group hover:bg-accent focus-visible:outline-ring inline-flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]"
										aria-label={`Suivre ${BRAND.name} sur TikTok (nouvelle fenêtre)`}
									>
										<TikTokIcon
											decorative
											size={20}
											className="text-foreground group-hover:drop-shadow-[0_0_6px_var(--color-glow-mint)] motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)] motion-safe:group-hover:scale-110"
										/>
										<span className="text-foreground text-sm/6 font-medium antialiased">
											{BRAND.social.tiktok.handle}
										</span>
									</FooterLink>
								</li>
							</ul>
						</nav>
					</div>

					{/* Reassurance - Baymard UX trust signals */}
					<section aria-label="Engagements et garanties" className="mb-8 sm:mb-10">
						<ul className="grid gap-3 sm:grid-cols-3">
							{REASSURANCE_ITEMS.map((item) => (
								<li
									key={item.title}
									className="bg-card/50 border-border/60 hover:border-border rounded-xl border px-5 py-4 shadow-sm hover:shadow-md motion-safe:transition-shadow motion-safe:duration-[var(--duration-normal)]"
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
						className="border-border/60 flex flex-col items-center gap-3 border-t pt-8"
						aria-labelledby="footer-payment-title"
					>
						<h3 id="footer-payment-title" className="sr-only">
							Paiement sécurisé
						</h3>
						<p className="text-muted-foreground flex items-center gap-2 text-sm">
							<span>Sécurisé par</span>
							<StripeWordmark className="text-muted-foreground" />
						</p>
						<ul className="flex items-center gap-4" aria-label="Moyens de paiement acceptés">
							<li className="text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]">
								<VisaIcon aria-label="Visa accepté" />
							</li>
							<li className="text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]">
								<MastercardIcon aria-label="Mastercard accepté" />
							</li>
							<li className="text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]">
								<CBIcon aria-label="Carte Bancaire acceptée" />
							</li>
						</ul>
					</section>

					{/* Copyright + Liens légaux */}
					<div className="flex flex-col items-center gap-4 pt-8">
						<p
							className="text-muted-foreground text-center text-sm/6 antialiased"
							suppressHydrationWarning
						>
							© {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.
						</p>
						<nav
							aria-label="Liens légaux"
							className="flex flex-col items-center justify-center gap-x-2 sm:flex-row sm:flex-wrap"
						>
							{legalLinks.map((link) => (
								<FooterLink
									key={link.href}
									href={link.href}
									haptic="selection"
									aria-label={"ariaLabel" in link ? link.ariaLabel : undefined}
									className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm antialiased focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)] sm:justify-start"
								>
									{link.label}
								</FooterLink>
							))}
							<ManageCookiesButton className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm antialiased focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)] sm:justify-start" />
						</nav>
					</div>
				</Fade>
			</div>
		</footer>
	);
}
