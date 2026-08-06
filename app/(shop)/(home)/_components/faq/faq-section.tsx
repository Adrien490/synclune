import { MaskingTape } from "@/shared/components/masking-tape";
import { HandDrawnRail } from "@/shared/components/storefront-heading";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import {
	ANSWER_LINK_CLASS,
	FAQ_ITEMS,
	FAQ_SECTIONS,
	type FaqSection,
} from "@/shared/constants/faq-items";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";

/**
 * Ancre de la section — c'est la CIBLE de la redirection 308 de `/aide`
 * (`next.config.ts`) et la destination de `ROUTES.SHOP.HELP` (`/#faq`).
 * Renommer l'`id` sans toucher aux deux autres casserait le lien en silence :
 * un fragment inconnu ne produit aucune erreur, la page s'ouvre juste en haut.
 *
 * Volontairement NON exporté : rien hors de ce fichier n'a besoin de la valeur
 * (`ROUTES.SHOP.HELP` et la règle de `next.config.ts` sont des littéraux, et
 * l'accord des trois est vérifié statiquement par
 * `legal-urls-coherence.regression.test.ts`). L'exporter en ferait un export
 * mort — knip le signalerait, et à raison.
 */
const FAQ_SECTION_ID = "faq";

const TITLE_ID = "faq-title";

/** Les cinq groupes, dans l'ordre de la SSOT. */
const SECTION_KEYS = Object.keys(FAQ_SECTIONS) as FaqSection[];

/**
 * La note soleil : l'item OUVERT devient un papier posé sur la page.
 *
 * Direction « B — La note soleil » (audit FAQ du 2026-08-05). Le geste tient à
 * une arithmétique : marge négative + padding de même valeur, donc **le texte
 * de la question ne bouge pas d'un pixel à l'ouverture** — c'est le papier qui
 * s'étend au-delà de la colonne (−12 px sous `sm`, −16 px au-dessus ; à 390 px
 * il reste les 4 px de marge de page). Le fond est `--section-wash-strong`,
 * disponible parce que la section porte `data-accent="sun"` — jamais un hex :
 * la cascade de `section-accents.css` est la SSOT des lavis.
 *
 * `ring` et non `border` : un vrai bord ajouterait 1 px à la géométrie et
 * ferait bouger le texte. `data-open:border-transparent` éteint le filet
 * `border-b` de l'item (couleur seule, zéro layout) — la note le remplace.
 * L'état ouvert ne repose pas sur cette couleur : le chevron pivote et le
 * panneau est présent (WCAG 1.4.1).
 */
const NOTE_ITEM_CLASS =
	"scroll-mt-24 data-open:-mx-3 data-open:px-3 sm:data-open:-mx-4 sm:data-open:px-4 " +
	"data-open:rounded-xl data-open:border-transparent data-open:bg-(--section-wash-strong) " +
	"data-open:shadow-paper data-open:ring-1 data-open:ring-brand-sun/40 " +
	"motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-200";

/**
 * L'élément du CTA de sortie, hissé hors du JSX pour une raison de lint et pas
 * de style : `jsx-a11y/anchor-has-content` ne voit que le JSX passé à `render`,
 * vide par construction — Base UI remplace l'ÉLÉMENT et laisse les enfants au
 * `Button`, qui les dépose dans l'ancre au rendu (cf. JSDoc de `Button`). Écrit
 * en ligne, le faux positif n'est pas silençable proprement : la règle se
 * déclenche sur la ligne de la prop, pas sur celle de la balise.
 *
 * `<a>` nu et pas `<Link>` : un `mailto:` n'emprunte pas le routeur, et
 * `next/link` y ajouterait un prefetch sans objet.
 */
// eslint-disable-next-line jsx-a11y/anchor-has-content
const MAILTO_ANCHOR = <a href={`mailto:${BRAND.contact.email}`} />;

/**
 * « Des questions ? » — la FAQ, sur la landing.
 *
 * @description
 * La page `/aide` a été absorbée ici le 2026-08-05 : tout vit sur la landing.
 * Ce qui a changé au passage, et pourquoi :
 *
 * - **Plus de champ de recherche.** Sur onze questions déjà rangées en cinq
 *   groupes et toutes présentes dans le DOM, un filtre local ne remplaçait que
 *   le `Ctrl+F` du navigateur — et un second champ de recherche à mi-page
 *   entrait en concurrence visuelle avec la recherche produits de la barre.
 * - **Plus de date de dernière mise à jour visible.** Elle situait une page
 *   d'aide autonome ; au milieu d'une landing, c'est du bruit. `dateModified`
 *   reste émis dans le JSON-LD `FAQPage`, où il sert vraiment (Google).
 * - **Hiérarchie décalée d'un cran.** Le `h1` appartient à l'étal, donc cette
 *   section prend le `h2`, ses cinq groupes des `h3`, et les questions des
 *   `h4` (`headingLevel={4}`) — sur `/aide` c'étaient respectivement le `h1`,
 *   des `h2` et des `h3`. Un `h2` par question rouvrirait un saut de niveau.
 *
 * Puis la direction « B — La note soleil » (audit du 2026-08-05, lots 0-2) :
 *
 * - **`data-accent="sun"`** — l'accent que la barre réservait à la salle
 *   « Aide » (`resolveNavbarSection`) : la salle a disparu, la section devient
 *   la salle. La cascade `--section-wash*` de `section-accents.css` alimente
 *   la note soleil (cf. `NOTE_ITEM_CLASS`).
 * - **La sortie de secours est une carte** (papier + masking tape rose), en
 *   colonne droite sticky ≥ `lg` — elle occupe le tiers que `max-w-3xl`
 *   laissait vide à 1280 — et revient dans le flux, après les questions, en
 *   dessous. Pas de sticky mobile : refus documenté (CTA sticky PDP).
 * - **Le rail se dessine à l'arrivée** (`inView` — timeline `view()`), et le
 *   bloc titre entre en `.enter-inview` : la section n'apparaît plus « déjà
 *   finie ».
 *
 * Server Component : les accordéons sont le seul JS client de la section, et
 * `FAQ_ITEMS` est une constante — rien ici ne dépend d'un `await`, donc la
 * section entière tient dans le shell statique de la landing.
 */
export function FaqSection() {
	return (
		<section
			id={FAQ_SECTION_ID}
			aria-labelledby={TITLE_ID}
			data-accent="sun"
			// `scroll-mt` compense la barre FIXE : sans lui, l'arrivée par
			// `/#faq` (redirection de `/aide`, lien du pied de page, lien du
			// panneau mobile) colle le titre sous la navbar. Dérivé de
			// `--navbar-height-static`, jamais de `--navbar-height` — celle-ci
			// retombe de 5rem à 4rem au premier pixel scrollé.
			className={`${CONTAINER_CLASS} scroll-mt-[calc(var(--navbar-height-static)+1.5rem)] pb-16 lg:pb-24`}
		>
			{/* AUCUN séparateur entre les sections de la landing (2026-08-06) : ni
			    filet, ni fond plein — une bande serait le contre-pied de la direction
			    « L'étal continue », et le filet haut a fini par en être une version
			    faible. Seul le rythme vertical sépare. L'accent soleil passe par les
			    SURFACES INTERNES (note ouverte, carte), jamais par une bande. */}
			<div className="pt-12 lg:pt-16">
				<div className="enter-inview max-w-[46ch]">
					<h2
						id={TITLE_ID}
						className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.08] font-light tracking-[-0.015em]"
					>
						Des questions&nbsp;?
					</h2>

					{/* UNE touche de pinceau, en soleil — l'accent de la salle. `inView` :
					    la section est sous la ligne de flottaison, le tracé se joue à
					    l'ARRIVÉE (timeline `view()`), pas au montage où personne ne le
					    verrait. Repli : trait déjà sec (Safari ≤ 18, reduced-motion). */}
					<div aria-hidden="true" className="mt-1.5 mb-3 flex sm:mt-2 sm:mb-5">
						<HandDrawnRail accent="bg-brand-sun" inView />
					</div>

					<p className="text-muted-foreground text-[1.0625rem] leading-[1.65]">
						Livraison, retours, entretien des bijoux… voici les réponses à celles qu&apos;on me pose
						le plus. Si tu ne trouves pas la tienne,{" "}
						{/* Même encre que les liens de réponse (SSOT `ANSWER_LINK_CLASS`).
						    Sur mobile la carte « Écris-moi » n'arrive qu'après les onze
						    questions : le chapô offre la sortie dès l'entrée de section. */}
						<a href={`mailto:${BRAND.contact.email}`} className={ANSWER_LINK_CLASS}>
							écris-moi
						</a>
						.
					</p>
				</div>

				{/* ≥ lg : deux colonnes — les questions gardent leur mesure (48rem =
				    max-w-3xl), la carte « Écris-moi » occupe le tiers droit et suit le
				    défilement. Le sticky est porté par la CELLULE (`self-start` + la
				    zone de grille haute d'une rangée pleine) — jamais par un enfant
				    d'une cellule `items-start`, dont la hauteur de contenu ne laisse
				    aucune course (sticky mort du rail de filtres, 2026-08-05). */}
				<div className="mt-8 sm:mt-10 lg:grid lg:grid-cols-[minmax(0,48rem)_minmax(0,1fr)] lg:gap-16">
					<div className="max-w-3xl space-y-10">
						{SECTION_KEYS.map((sectionKey) => {
							const items = FAQ_ITEMS.filter((item) => item.section === sectionKey);
							if (items.length === 0) return null;

							return (
								<section key={sectionKey} aria-labelledby={`faq-${sectionKey}`}>
									<h3
										id={`faq-${sectionKey}`}
										className="font-display text-foreground mb-3 text-xl font-normal"
									>
										{FAQ_SECTIONS[sectionKey]}
									</h3>
									<Accordion multiple={false} className="w-full">
										{items.map((item) => (
											<AccordionItem key={item.id} value={item.id} className={NOTE_ITEM_CLASS}>
												{/* `font-normal` : la base du trigger est `font-medium`, ce qui
												    rendait le `data-panel-open:font-medium` inopérant — onze
												    questions au même poids. Fermée, la question s'écrit en
												    normal ; ouverte, elle prend le medium : c'est la note qui
												    a du poids, pas la liste. */}
												<AccordionTrigger
													headingLevel={4}
													className="text-base font-normal data-panel-open:font-medium sm:text-lg"
												>
													{item.question}
												</AccordionTrigger>
												{/* `px-0` : la réponse s'aligne sur l'axe de sa question
												    (le `px-3` par défaut du panneau indentait chaque
												    réponse de 12 px sans intention — lot 0 de l'audit).
												    Sur la note ouverte, c'est le padding de l'ITEM qui
												    porte le retrait du papier, pour les deux à la fois.
												    `hiddenUntilFound` : un panneau `keepMounted` fermé est
												    `hidden` (display:none), donc INVISIBLE au Ctrl+F — or
												    l'absence de champ de recherche repose exactement sur lui
												    (cf. JSDoc de `faq-items`). `hidden="until-found"` rend le
												    texte trouvable et Base UI rouvre le panneau au
												    `beforematch` (Chromium/Firefox ; ailleurs le comportement
												    actuel, sans régression). */}
												<AccordionContent
													hiddenUntilFound
													className="text-muted-foreground px-0 text-base leading-relaxed"
												>
													{item.answer}
												</AccordionContent>
											</AccordionItem>
										))}
									</Accordion>
								</section>
							);
						})}
					</div>

					{/* La sortie de secours : la FAQ dévie ce qu'elle peut, le reste part
					    en email (cf. `MAILTO_ANCHOR` pour le pourquoi de l'ancre nue).
					    Carte papier + tape ROSE (`MaskingTape`, SSOT — le rose signature,
					    pas de `tint`) : le seul vocabulaire « fait main » que la section
					    porte en dehors du trait. Pas de signature « — Léane » : le
					    storefront ne signe qu'une fois par page, dans le footer. */}
					<div className="mt-12 lg:sticky lg:top-[calc(var(--navbar-height-static)+1.5rem)] lg:mt-0 lg:self-start">
						<div className="bg-card shadow-paper relative rounded-2xl border p-6">
							<MaskingTape className="-top-2 left-6 z-10 h-4 w-14 -rotate-3" />
							<h3 className="font-display text-xl font-normal">
								Ta question n&apos;est pas là&nbsp;?
							</h3>
							<p className="text-muted-foreground mt-2 text-[0.9375rem] leading-relaxed">
								Écris-moi, je réponds sous 48&nbsp;h. C&apos;est moi qui lis, c&apos;est moi qui
								réponds.
							</p>
							<Button render={MAILTO_ANCHOR} variant="outline" className="mt-4">
								Écrire à Léane
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
