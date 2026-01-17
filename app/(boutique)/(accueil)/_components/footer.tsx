import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import {
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
import Link from "next/link";
import { CopyrightYear } from "./copyright-year";

/**
 * Footer statique de l'application
 *
 * Contenu entierement statique (navigation, liens, contact).
 */
export function Footer() {
	return (
		<footer
			className="relative bg-background overflow-hidden"
			aria-label="Informations de contact et navigation du site"
			data-voice-queries="contact Synclune,créatrice bijoux artisanaux,bijoux faits main"
			data-content-type="footer-business"
			data-ai-category="jewelry-artisan-footer"
			itemScope
			itemType="https://schema.org/Organization"
		>
			{/* Organization structured data - SEO */}
			<meta itemProp="name" content={BRAND.name} />
			<meta itemProp="url" content={BRAND.website.url} />
			<link itemProp="logo" href={`${BRAND.website.url}${BRAND.logo.url}`} />
			<meta itemProp="description" content={BRAND.description} />

			{/* Contenu sr-only pour voice search */}
			<p className="sr-only">
				Footer du site de Synclune, créatrice de bijoux faits main avec amour.
				Retrouvez les coordonnées de contact, navigation du site et informations
				légales.
			</p>

			{/* Titre sr-only pour hiérarchie des headings */}
			<h2 className="sr-only">Informations et liens utiles</h2>

			{/* Masque flou en haut pour transition douce (réduit sur mobile) */}
			<div
				className="absolute top-0 left-0 right-0 h-6 sm:h-12 bg-linear-to-b from-background to-transparent pointer-events-none"
				aria-hidden="true"
			/>

			<div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${FOOTER_PADDING}`}>
				{/* Navigation principale - Ordre mobile: Logo, Réseaux, Navigation, Contact */}
				<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-8">
					{/* Colonne 1: Logo + phrase perso */}
					<div className="order-1 space-y-4">
						<div className="mb-4">
							<Logo href="/" size={40} className="lg:[&_>_div]:size-12" />
						</div>
						<div className="space-y-2 max-w-xs">
							<p className="text-sm/6 antialiased text-muted-foreground">
								<span className="font-medium text-foreground">
									Des bijoux colorés
								</span>
								<br />
								créés avec passion
							</p>
						</div>
					</div>

					{/* Colonne 2: Réseaux sociaux (mobile-first: affiché en 2ème position sur mobile) */}
					<nav
						aria-labelledby="footer-social-title"
						className="order-2 sm:order-4 lg:order-4"
					>
						<h3
							id="footer-social-title"
							className="text-base/6 font-medium antialiased text-foreground mb-4"
						>
							Réseaux sociaux
						</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={BRAND.social.instagram.url}
									itemProp="sameAs"
									target="_blank"
									rel="noopener noreferrer"
									prefetch={false}
									className="inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
									aria-label="Suivre Synclune sur Instagram"
								>
									<InstagramIcon
										decorative
										size={20}
										className="text-foreground"
									/>
									<span className="text-sm/6 font-medium antialiased text-foreground">
										{BRAND.social.instagram.handle}
									</span>
								</Link>
							</li>
							<li>
								<Link
									href={BRAND.social.tiktok.url}
									itemProp="sameAs"
									target="_blank"
									rel="noopener noreferrer"
									prefetch={false}
									className="inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
									aria-label="Suivre Synclune sur TikTok"
								>
									<TikTokIcon
										decorative
										size={20}
										className="text-foreground"
									/>
									<span className="text-sm/6 font-medium antialiased text-foreground">
										{BRAND.social.tiktok.handle}
									</span>
								</Link>
							</li>
						</ul>
					</nav>

					{/* Colonne 3: Navigation */}
					<nav aria-labelledby="footer-nav-title" className="order-3 sm:order-2 lg:order-2">
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

					{/* Colonne 4: Contact */}
					<section aria-labelledby="footer-contact-title" className="order-4 sm:order-3 lg:order-3">
						<h3 id="footer-contact-title" className="text-base/6 font-medium antialiased text-foreground mb-4">
							Contact
						</h3>
						<div
							itemProp="contactPoint"
							itemScope
							itemType="https://schema.org/ContactPoint"
							className="space-y-3"
						>
							<meta itemProp="contactType" content="customer service" />
							<meta itemProp="availableLanguage" content="French" />
							{/* Email - CTA principal avec style proéminent */}
							<a
								href={`mailto:${BRAND.contact.email}`}
								itemProp="email"
								className="inline-flex items-center px-3 py-2 min-h-11 text-sm/6 antialiased font-medium text-foreground hover:bg-accent rounded-lg transition-colors duration-200 wrap-break-words focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
								aria-label="Envoyer un email à Synclune"
							>
								{BRAND.contact.email}
							</a>

							<div
								itemProp="areaServed"
								itemScope
								itemType="https://schema.org/Place"
							>
								<div
									itemProp="address"
									itemScope
									itemType="https://schema.org/PostalAddress"
									className="text-sm/6 antialiased text-muted-foreground px-3"
								>
									<span>Atelier basé à </span>
									<span itemProp="addressLocality">Nantes</span>
									<span>, </span>
									<span itemProp="addressRegion">Loire-Atlantique</span>
									<span>, </span>
									<span itemProp="addressCountry">France</span>
								</div>
							</div>
						</div>
					</section>
				</div>

				{/* Paiement sécurisé */}
				<section className="flex flex-col items-center gap-3 pt-8 border-t border-border" aria-labelledby="footer-payment-title">
					<h3 id="footer-payment-title" className="text-sm text-muted-foreground">Paiement sécurisé</h3>
					<meta itemProp="paymentAccepted" content="Visa, Mastercard, CB, PayPal" />
					<ul className="flex items-center gap-4" aria-label="Moyens de paiement acceptés">
						<li><VisaIcon aria-label="Visa accepté" className="text-muted-foreground" /></li>
						<li><MastercardIcon aria-label="Mastercard accepté" className="text-muted-foreground" /></li>
						<li><CBIcon aria-label="Carte Bancaire acceptée" className="text-muted-foreground" /></li>
						<li><PayPalIcon aria-label="PayPal accepté" className="text-muted-foreground" /></li>
					</ul>
				</section>

				{/* Copyright + Liens légaux */}
				<div className="flex flex-col items-center gap-4 pt-6">
					<p className="text-sm/6 antialiased text-muted-foreground text-center">
						© <CopyrightYear /> Synclune. Tous droits réservés.
					</p>
					<nav
						aria-label="Liens légaux"
						className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-x-1"
					>
						{legalLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-sm antialiased text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-lg px-3 py-2 min-h-11 inline-flex items-center justify-center sm:justify-start"
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
			</div>
		</footer>
	);
}
