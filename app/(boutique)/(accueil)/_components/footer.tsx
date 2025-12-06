import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { Logo } from "@/shared/components/logo";
import { BRAND } from "@/shared/constants/brand";
import { footerNavItems, legalLinks } from "@/shared/constants/navigation";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Footer statique de l'application
 *
 * Utilise "use cache" pour mettre en cache le rendu complet du footer
 * car le contenu est entièrement statique (navigation, liens, contact).
 */
export async function Footer() {
	"use cache";
	cacheLife("reference");
	cacheTag("footer");

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

			{/* Masque flou en haut pour transition douce */}
			<div
				className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-background to-transparent pointer-events-none"
				aria-hidden="true"
			/>

			<div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Navigation principale */}
				<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-8">
					{/* Colonne 1: Logo + phrase perso */}
					<div className="space-y-4">
						<div className="mb-4">
							<Logo href="/" size={40} />
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

					{/* Colonne 2: Navigation */}
					<nav aria-labelledby="footer-nav-title">
						<h3
							id="footer-nav-title"
							className="text-base/6 font-medium antialiased text-foreground mb-4"
						>
							Navigation
						</h3>
						<ul className="space-y-3" role="list">
							{footerNavItems.map((item, index) => (
								<li key={index} role="listitem">
									<Link
										href={item.href}
										className="text-sm/6 antialiased text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm inline-block px-2 py-2"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Colonne 3: Contact */}
					<div>
						<h3 className="text-base/6 font-medium antialiased text-foreground mb-4">
							Contact
						</h3>
						<div
							itemProp="contactPoint"
							itemScope
							itemType="https://schema.org/ContactPoint"
							className="space-y-3"
						>
							<div>
								<a
									href={`mailto:${BRAND.contact.email}`}
									itemProp="email"
									className="text-sm/6 antialiased text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-200 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
									aria-label="Envoyer un email à Synclune"
								>
									{BRAND.contact.email}
								</a>
							</div>

							<div
								itemProp="areaServed"
								itemScope
								itemType="https://schema.org/Place"
							>
								<div
									itemProp="address"
									itemScope
									itemType="https://schema.org/PostalAddress"
									className="text-sm/6 antialiased text-muted-foreground"
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

					{/* Colonne 4: Réseaux sociaux */}
					<div>
						<h3 className="text-base/6 font-medium antialiased text-foreground mb-4">
							Réseaux sociaux
						</h3>
						<div className="space-y-3">
							{/* Instagram */}
							<Link
								href={BRAND.social.instagram.url}
								itemProp="sameAs"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
								className="inline-flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-accent hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
				</div>

				{/* Copyright + Liens légaux */}
				<div className="flex flex-col items-center gap-4">
					<p className="text-sm/6 antialiased text-muted-foreground text-center">
						© {new Date().getFullYear()} Synclune. Tous droits réservés.
					</p>
					<nav
						aria-label="Liens légaux"
						className="flex flex-wrap justify-center gap-x-4 gap-y-2"
					>
						{legalLinks.map((link, index) => (
							<Link
								key={index}
								href={link.href}
								className="text-xs antialiased text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
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
