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
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { formatShippingPrice } from "@/modules/orders/services/shipping.service";
import { StripeWordmark } from "@/modules/payments/components/stripe-wordmark";
import { cacheLife, cacheTag } from "next/cache";
import { ManageCookiesButton } from "@/shared/components/manage-cookies-button";
import { BASE_TACTILE_CLASSES, FooterLink } from "./footer-link";
import { STATIC_PAGES_CACHE_TAGS } from "@/shared/constants/cache-tags";

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
// ⚠️ Aucune des trois constantes ci-dessous ne déclare de `transition-*` ni de
// `duration-*` : c'est `BASE_TACTILE_CLASSES` qui les porte, pour tout le footer.
// En déclarer une ici la mettrait en concurrence avec la sienne, et le gagnant
// serait décidé par l'ordre d'émission Tailwind — pas par l'ordre d'écriture.
// Cf. le docblock de `footer-link.tsx`, et la régression qui le verrouille.
const COLUMN_LINK_CLASS =
	"text-muted-foreground can-hover:hover:bg-primary/5 inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 antialiased";
// `px-2` et non `px-3` : à 1280 px les 7 entrées tiennent alors sur UNE ligne à
// côté du bloc paiement (elles débordaient de ~30 px). La hauteur de cible reste
// 44 px — c'est `min-h-11` qui la porte, pas le padding horizontal.
const LEGAL_LINK_CLASS =
	"text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground inline-flex min-h-11 items-center rounded-lg px-2 py-2 text-sm antialiased";
const SOCIAL_PASTILLE_CLASS =
	"border-border/70 text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-foreground inline-flex size-11 items-center justify-center rounded-full border";

/**
 * Lightweight skeleton matching Footer's outer shell to prevent CLS during streaming.
 *
 * Les trois hauteurs sont MESURÉES (Playwright, /cgv, 2026-08-05), pas estimées.
 * Chacune couvre le pire cas de sa plage, pas un point confortable au milieu :
 *
 *   < 640 px   1373 px à 320  (1349 de 360 à 390 ; 1309 à 639)   → 87.5rem
 *   640-1023    992 px à 768  (986 à 640 ; 944 à 1023)           → 63.5rem
 *   >= 1024     667 px à 1024 (619 dès 1280 — le bandeau légal
 *               tient encore sur DEUX lignes à 1024)             → 42.5rem
 *
 * Marge de ~2 % au-dessus : une réserve trop grande fait remonter le contenu (le
 * scroll ne bouge pas), une réserve trop courte le pousse vers le bas sous le doigt.
 *
 * ⚠️ **En REM, pas en px** — et ce n'est pas cosmétique. Presque tout ce que réserve
 * cette boîte (`py-12`, `gap-*`, les tailles de texte) est déjà en rem chez Tailwind :
 * à 200 % de police racine (WCAG 1.4.4) le footer réel double, alors qu'une réserve en
 * px reste figée. Les anciennes valeurs `1090/760/495` sous-réservaient déjà de 35 à
 * 143 px à 100 %, et de ~2 000 px à 200 % — le commentaire annonçait « ~2 % au-dessus »
 * alors que la marge était NÉGATIVE partout. Une réserve en rem suit l'agrandissement.
 *
 * ⚠️ `--bottom-bar-height` (57 px) est publiée au RUNTIME, et `FOOTER_PADDING` l'ajoute
 * à son `padding-bottom` : mesurer avant hydratation sous-estime le footer d'autant.
 * C'est l'essentiel de la dérive des anciennes valeurs. Mesurer APRÈS `networkidle`.
 *
 * Verrouillé par `__tests__/footer-skeleton-height.regression.test.tsx`.
 */
export function FooterSkeleton() {
	return (
		<footer className={FOOTER_SHELL_CLASS} aria-label={FOOTER_LABEL} aria-busy="true">
			<div className={`${CONTAINER_CLASS} ${FOOTER_PADDING}`}>
				<div className="min-h-[87.5rem] sm:min-h-[63.5rem] lg:min-h-[42.5rem]" />
			</div>
		</footer>
	);
}

/**
 * Footer statique de l'application — direction « La signature ».
 *
 * Le pied de page est l'endroit où l'atelier signe : une zone de signature
 * (phrase de marque en display, « — Léane », réseaux), deux colonnes serrées,
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
							<Logo href="/" size={40} sizeMd={48} viewTransitionName="shop-logo-footer" />

							{/* `text-balance` : sans lui, « Des bijoux colorés créés / avec passion »
							    coupait entre le verbe et son complément à 390 px, et l'accent
							    manuscrit tombait au milieu de la première ligne. */}
							<p className="font-display text-foreground mt-6 max-w-[17rem] text-2xl leading-[1.25] font-normal text-balance antialiased sm:text-[1.625rem]">
								Des bijoux{" "}
								<span className="relative inline-block">
									colorés
									{/* Pas de `delay` : il serait INERTE ici, comme `once` /
									    `disableOnTouch` sur le <Fade> ci-dessus. `--hand-delay` n'est lu
									    que par `.hand-draw-load` (app/styles/entrance.css) ; la branche
									    `inView` est pilotée par `animation-timeline: view()`, où
									    `animation-delay` n'a de toute façon aucun sens.
									    La cascade entre cet accent et celui de « — Léane » existe quand
									    même : chaque tracé suit SA propre position au scroll, et celui de
									    la signature est ~90 px plus bas. C'est le scroll qui l'échelonne,
									    pas une durée — ne pas réintroduire de `delay` pour « régler » ça. */}
									{/* Géométrie : width seule, hauteur dérivée du ratio 6:1 — le
									    couple 96×14 letterboxait l'encre (81,2 px rendus sur 96,
									    mesure au navigateur, audit 2026-08-05). Couleur : le défaut
									    cascadé (hors [data-accent], repli --primary — même rendu). */}
									<HandDrawnAccent
										variant="underline"
										width={96}
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
									{/* `delay` retiré ici aussi — cf. l'accent de « colorés » ci-dessus. */}
									{/* Même correctif que l'accent de « colorés » : l'ancien 92×12
									    rendait 69,6 px d'encre décalés de 11,2 px — le trait
									    commençait sous le « L » et ignorait le tiret. */}
									<HandDrawnAccent
										variant="underline"
										width={92}
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
									className="text-foreground can-hover:hover:bg-primary/8 wrap-break-words inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm/6 font-medium antialiased"
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

					{/* Réassurance — livraison + retours.

					    Elle vit ICI, et pas « sous le hero » : le `HeroReassuranceBanner` que
					    cet emplacement citait comme SSOT a été supprimé avec le vidage de la
					    landing (2026-08-03). Elle ne survivait donc plus que sur la PDP
					    (`ProductReassurance`) et le checkout (`CheckoutTrustBadge`) — ni la
					    home, ni /produits, ni /collections, ni /favoris n'en portaient trace.
					    Le footer est la seule surface commune à toutes ces pages.

					    Volontairement TERSE, et sans icônes (refus enregistré sur le bandeau
					    du hero) : la version détaillée reste celle de la PDP, près du point de
					    décision (Baymard). Ici on rassure une visiteuse qui parcourt, on ne
					    répète pas une fiche.

					    Montants dérivés de `SHIPPING_RATES` — jamais de littéral : la même
					    valeur est déjà affichée par `ProductReassurance`, les deux ne peuvent
					    pas divorcer. « Retours et échanges sous 14 jours » reprend la chaîne
					    EXACTE de ce composant : les 14 jours n'ont pas de constante (~14 sites
					    en dur, tous légaux), une chaîne identique laisse un seul motif à
					    grepper le jour d'une passe SSOT. */}
					<section
						aria-labelledby="footer-reassurance-title"
						className="border-border/60 mb-8 border-t pt-8"
					>
						<h3 id="footer-reassurance-title" className="sr-only">
							Livraison et retours
						</h3>
						{/* `gap-x-6` sépare les deux faits, sans caractère séparateur entre elles :
						    un « · » en `text-border` y était invisible en desktop (0,92 de clarté
						    sur un fond à 0,99) et, en mobile, restait pendu en fin de ligne au
						    retour à la ligne. Le « · » qui subsiste est du TEXTE, entre France et
						    UE — il se lit, lui, et ne peut pas se retrouver orphelin. */}
						<p className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-sm/6 antialiased">
							<span>
								Livraison France {formatShippingPrice(SHIPPING_RATES.FR.amount)} · Union européenne{" "}
								{formatShippingPrice(SHIPPING_RATES.EU.amount)}
							</span>
							<span>Retours et échanges sous 14 jours</span>
						</p>
					</section>

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
									{/* Pas un FooterLink, donc rien ne lui injecte le socle tactile : on
									    le compose ici, à l'identique de ses six voisins. Il lui manquait
									    `touch-manipulation` et `active:scale-[0.98]` — seule cible de la
									    rangée à ne pas répondre à l'appui. (`focus-ring` et
									    `cursor-pointer` sont dans le socle et dans `pwa.css`
									    respectivement : ne pas les redonner ici.) */}
									<ManageCookiesButton className={`${LEGAL_LINK_CLASS} ${BASE_TACTILE_CLASSES}`} />
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
