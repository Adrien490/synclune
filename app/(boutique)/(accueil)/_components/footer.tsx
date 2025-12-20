import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
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
			{/* Meta tags invisibles pour schema.org (crawlables) */}
			<meta itemProp="name" content="Synclune" />
			<meta
				itemProp="description"
				content="Créatrice de bijoux artisanaux faits main à Nantes - Créations uniques pour occasions particulières"
			/>
			<meta itemProp="url" content="https://synclune.fr" />
			<link itemProp="logo" href="https://synclune.fr/logo.png" />

			{/* Contenu sr-only pour voice search */}
			<p className="sr-only">
				Footer du site de Synclune, créatrice de bijoux faits main avec amour.
				Retrouvez les coordonnées de contact, navigation du site et informations
				légales.
			</p>

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
							{/* Logo responsive: 40px mobile → 48px desktop */}
							<div className="lg:hidden">
								<Logo href="/" size={40} />
							</div>
							<div className="hidden lg:block">
								<Logo href="/" size={48} />
							</div>
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
					<div className="order-2 sm:order-4 lg:order-4">
						<h3 className="text-base/6 font-medium antialiased text-foreground mb-4">
							Réseaux sociaux
						</h3>
						<div className="space-y-2">
							{/* Instagram */}
							<Link
								href={BRAND.social.instagram.url}
								itemProp="sameAs"
								target="_blank"
								rel="noopener noreferrer"
								prefetch={false}
								className="inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
								aria-label="Suivre Synclune sur Instagram (ouvre dans un nouvel onglet)"
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

							{/* TikTok */}
							<Link
								href={BRAND.social.tiktok.url}
								itemProp="sameAs"
								target="_blank"
								rel="noopener noreferrer"
								prefetch={false}
								className="inline-flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
								aria-label="Suivre Synclune sur TikTok (ouvre dans un nouvel onglet)"
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
						</div>
					</div>

					{/* Colonne 3: Navigation */}
					<nav aria-labelledby="footer-nav-title" className="order-3 sm:order-2 lg:order-2">
						<h3
							id="footer-nav-title"
							className="text-base/6 font-medium antialiased text-foreground mb-4"
						>
							Navigation
						</h3>
						<ul className="space-y-2" role="list">
							{footerNavItems.map((item, index) => (
								<li key={index} role="listitem">
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
					<div className="order-4 sm:order-3 lg:order-3">
						<h3 className="text-base/6 font-medium antialiased text-foreground mb-4">
							Contact
						</h3>
						<div
							itemProp="contactPoint"
							itemScope
							itemType="https://schema.org/ContactPoint"
							className="space-y-3"
						>
							{/* Email - CTA principal avec style proéminent */}
							<a
								href={`mailto:${BRAND.contact.email}`}
								itemProp="email"
								className="inline-flex items-center px-3 py-2 min-h-11 text-sm/6 antialiased font-medium text-foreground hover:bg-accent rounded-lg transition-colors duration-200 break-all focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
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
					</div>
				</div>

				{/* Copyright + Liens légaux */}
				<div className="flex flex-col items-center gap-4 pt-8 border-t border-border">
					<p className="text-sm/6 antialiased text-muted-foreground text-center">
						© <CopyrightYear /> Synclune. Tous droits réservés.
					</p>
					<nav
						aria-label="Liens légaux"
						className="flex flex-wrap justify-center items-center"
					>
						{legalLinks.map((link, index) => (
							<span key={index} className="inline-flex items-center">
								<Link
									href={link.href}
									className="text-sm antialiased text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-lg px-3 py-2 min-h-11 inline-flex items-center"
								>
									{link.label}
								</Link>
								{index < legalLinks.length - 1 && (
									<span className="text-muted-foreground/50 select-none" aria-hidden="true">·</span>
								)}
							</span>
						))}
					</nav>
				</div>
			</div>
		</footer>
	);
}
