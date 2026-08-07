import { CREATION_PATHS } from "@/shared/components/hand-drawn/paths";
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
import { ANSWER_LINK_CLASS, FAQ_ITEMS } from "@/shared/constants/faq-items";
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

/**
 * Le tracé de la marque de famille, pris dans la SSOT du présentoir plutôt que
 * redessiné. Il y est déjà rendu quatre fois — les « étoiles » peintes du
 * cabochon de la bague Nuit étoilée du premier écran (`creations.ts`,
 * `fill: PAINT_SUNNY`) — et c'est assumé : la règle de voisinage porte sur le
 * REGISTRE, pas sur la forme (tout le vocabulaire est déjà dépensé sur `/`).
 * Une touche de peinture en HEX à l'intérieur d'un tableau miniature et un
 * accent tokenisé en tête d'une liste de questions, à trois sections d'écart,
 * ne se lisent pas comme une répétition.
 */
const DAB = CREATION_PATHS.dab;

/**
 * La rangée du nuancier, et la note qu'elle devient une fois ouverte.
 *
 * Direction « F — Le nuancier, au bon calibre » (2026-08-06), qui remplace
 * « E — L'échantillonnier » du même jour : le lavis de famille sur les onze
 * rangées a été jugé trop fort, et c'est l'arbitrage que le § 5 de
 * `docs/LANDING-SECTION-FAQ.md` laissait ouvert entre les deux. La marque de
 * famille redevient donc une TOUCHE (cf. `FamilyDab`), et la rangée redevient
 * nue au repos — mais au calibre du voisin, pas à celui de « B — Le nuancier »,
 * qui la sous-dosait d'un ordre de grandeur.
 *
 * Ce qui reste de l'échantillonnier, et qu'il ne faut pas défaire : la note
 * ouverte prend le papier de SA famille (`--section-wash-strong` re-dérivé par
 * le `data-accent` de l'item) et non le soleil pour tout le monde, et l'anneau
 * suit (`--section-accent`). Les deux tokens ne sont pas interchangeables —
 * `--section-band` est mélangé vers `--background` et normalisé en ΔE accent
 * par accent (18 / 11 / 12 / 16 %), `--section-wash-strong` vers `--card` à
 * 18 % uniformes : le premier est le token d'une BANDE posée sur la page, le
 * second celui du PAPIER. Ici il n'y a plus de bande, seulement du papier.
 *
 * Le fond de la note est donc une simple couleur : le repos ne porte plus de
 * `background-image`, donc le piège qui imposait deux dégradés (un
 * `background-image` se peint PAR-DESSUS le `background-color`, et l'éteindre à
 * l'ouverture laisse la rangée nue pendant les 200 ms de fondu) n'a plus
 * d'objet.
 *
 * Le retrait reste **permanent** (−12 px sous `sm`, −16 px au-dessus ; à 390 px
 * il reste les 4 px de marge de page), et c'est ce qu'on garde de la refonte
 * précédente : l'invariant « **le texte de la question ne bouge pas d'un pixel
 * à l'ouverture** » cesse d'être une arithmétique à maintenir (marge négative +
 * padding égaux) pour devenir structurel — la géométrie ne change plus du tout.
 * Au repos il ne se voit pas, puisqu'il n'y a rien à peindre.
 *
 * `ring` et non `border` : un vrai bord ajouterait 1 px à la géométrie.
 * `data-open:border-transparent` éteint le filet `border-b` de l'item (couleur
 * seule, zéro layout) — la note le remplace. L'anneau se dérive de
 * `--section-accent`, donc de la famille de la question, jamais d'un token figé.
 * L'état ouvert ne repose sur AUCUNE de ces couleurs : le chevron pivote et le
 * panneau est présent (WCAG 1.4.1) — le papier rappelle une famille, il n'encode
 * rien d'indispensable.
 */
const NOTE_ITEM_CLASS =
	"scroll-mt-24 -mx-3 px-3 sm:-mx-4 sm:px-4 " +
	"data-open:rounded-xl data-open:border-transparent " +
	"data-open:bg-(--section-wash-strong) " +
	"data-open:shadow-paper data-open:ring-1 data-open:ring-(--section-accent)/40 " +
	"motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200";

/**
 * La touche de peinture de la famille — `CREATION_PATHS.dab`, le point de
 * pinceau rond et bancal de la SSOT des tracés.
 *
 * @description
 * **20 px, et c'est le fond du sujet.** « B — Le nuancier » (2026-08-06, matin)
 * la posait à 10 px : ≈ 42 px² d'encre, les onze ensemble ≈ 462 px² — moins
 * qu'UNE perle du fil de l'atelier (38 px remplis, ≈ 865 px²), à une section de
 * distance. Or les quatre accents de marque valent **1,58 · 1,60 · 1,91 ·
 * 2,58:1** sur le fond : à ce contraste une forme n'existe que par sa SURFACE,
 * et la plus petite pièce peinte de la section voisine fait **22 px**. Une
 * marque sous ce plancher n'existe pas. 16 px sous `sm` — la colonne n'y fait
 * que 358 px, et 20 px d'indentation y mangeraient la mesure du texte.
 *
 * `fill` et pas `stroke` : **l'accent PEINT, l'encre TRACE** (même règle que
 * les perles et les gouttes du fil de l'atelier). Le tracé est rendu SANS
 * contour, conformément à son JSDoc — qui justifie cette absence à 3 px, donc
 * a fortiori ici.
 *
 * Attribut `fill="var(--section-accent)"` plutôt qu'un utilitaire : la variable
 * est re-dérivée par le `data-accent` de l'`AccordionItem`, donc la touche prend
 * l'encre de sa famille sans qu'aucune couleur ne soit écrite ici.
 *
 * Pas d'animation d'entrée. La famille `hand-draw-*` **sait** animer un `fill`
 * (`entrance.css` interpole `fill-opacity`), mais sous une timeline `view()` le
 * stagger `--hand-delay` est ignoré : les onze touches arriveraient ensemble,
 * ce qui ne se lit pas comme un geste. Le rail du titre reste le seul geste
 * d'arrivée de la section.
 *
 * `contrast-more:hidden forced-colors:hidden` : en contraste forcé l'ornement
 * s'efface et l'encre du texte suffit — la touche ne porte aucune information
 * indispensable (WCAG 1.4.1), le regroupement par famille est un rappel.
 */
function FamilyDab() {
	return (
		<svg
			aria-hidden="true"
			viewBox={DAB.viewBox}
			className="mt-1 size-4 shrink-0 contrast-more:hidden sm:size-5 forced-colors:hidden"
		>
			<path d={DAB.d} fill="var(--section-accent)" />
		</svg>
	);
}

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
 *   section prend le `h2` et les questions des `h3` (`headingLevel={3}`) — sur
 *   `/aide` c'étaient le `h1` et des `h2`. Un `h2` par question rouvrirait un
 *   saut de niveau.
 *
 * Puis le **retrait du regroupement thématique** (2026-08-06) : les cinq `h3`
 * « Les bijoux / Livraison / … » ont disparu, les onze questions forment une
 * liste unique dans l'ordre de la SSOT (qui reste thématique — cf. JSDoc de
 * `faq-items`). Sur onze items, cinq intertitres découpaient la liste en
 * tronçons de deux, dont deux d'un seul item, et pesaient visuellement plus
 * lourd que les questions qu'ils annonçaient. ⚠️ Conséquence de niveaux : les
 * questions remontent de `h4` à `h3`, sinon la section saute un cran.
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
 * Puis **« F — Le nuancier, au bon calibre »** (2026-08-06, direction et lots
 * dans [`docs/LANDING-SECTION-FAQ.md`](../../../../../docs/LANDING-SECTION-FAQ.md)),
 * qui traite le défaut que « La note soleil » laissait entier — la couleur
 * n'existait qu'APRÈS un clic, donc sur un item sur onze, et sur aucun tant que
 * le visiteur n'avait rien ouvert — et qui succède à « E — L'échantillonnier »,
 * essayée le même jour : elle traitait le même défaut par un lavis de famille
 * sur les onze rangées, jugé trop fort. C'est **l'arbitrage que le § 5 du
 * document laissait explicitement ouvert entre E et F**, et il est tranché ici.
 *
 * Chaque question porte donc, au repos, la **touche de peinture** de sa famille
 * (`FamilyDab`) — quatre encres pour onze questions, en blocs de 4 · 3 · 2 · 2
 * (cf. la JSDoc de `FaqItem.accent`), et la note ouverte prend le papier de la
 * même famille (cf. `NOTE_ITEM_CLASS`). ⚠️ Ce qui distingue F de la « B — Le
 * nuancier » d'origine est **son seul calibre** : 20 px et non 10, parce que la
 * plus petite pièce peinte de la section voisine en fait 22 et qu'un accent à
 * 1,6:1 n'existe que par sa surface.
 *
 * La salle, elle, ne bouge pas : `data-accent="sun"` reste sur la `<section>`,
 * et c'est la rotation à l'INTÉRIEUR qui porte la polychromie — le mécanisme
 * que prescrit CLAUDE.md, jamais un token de plus par couleur.
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
			// ⚠️ PAS de `scroll-mt`, et c'est un RENVERSEMENT du 2026-08-06 : ce
			// commentaire disait « sans lui, l'arrivée par `/#faq` colle le titre sous
			// la navbar ». C'est faux — la barre est déjà compensée UNE fois par
			// `html { scroll-padding-top: var(--navbar-height) }` (`app/globals.css`),
			// et le `scroll-mt` la comptait DEUX fois.
			//
			// Mesuré à 1280 sur le chemin le plus emprunté (`/aide` → 308 vers `/#faq`,
			// plus le pied de page et le panneau mobile) : la section atterrissait avec
			// **104 px** de blanc sous la navbar et « Des questions ? » à 168 px. Sans
			// le `scroll-mt` : 0 px de blanc, titre à 64 px — c'est le `pt-12 lg:pt-16`
			// ci-dessous qui fait l'air, et il le fait bien.
			className={`${CONTAINER_CLASS} pb-16 lg:pb-24`}
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
					{/* UNE seule liste, dans l'ordre de la SSOT — plus de tri par thème
					    (2026-08-06). `multiple={false}` porte donc désormais sur les ONZE
					    questions et non sur un groupe : ouvrir une réponse ferme la
					    précédente où qu'elle soit, ce qui est exactement l'intention de la
					    note (un seul papier posé à la fois). */}
					<Accordion multiple={false} className="w-full max-w-3xl">
						{FAQ_ITEMS.map((item) => (
							<AccordionItem
								key={item.id}
								value={item.id}
								// L'encre de la FAMILLE (SSOT `FAQ_ITEMS`). `data-accent` posé
								// sur l'item re-dérive toute la cascade de
								// `section-accents.css` pour son sous-arbre : `--section-accent`
								// pour la touche et l'anneau, `--section-wash-strong` pour le
								// papier de la note. La rotation joue à l'INTÉRIEUR de la
								// salle, exactement comme les quatre étapes du fil de l'atelier
								// jouent à l'intérieur d'une section rose ; la `<section>`,
								// elle, reste dorée (cf. `THREAD_INK`).
								data-accent={item.accent}
								className={NOTE_ITEM_CLASS}
							>
								{/* `font-normal` : la base du trigger est `font-medium`, ce qui
								    rendait le `data-panel-open:font-medium` inopérant — onze
								    questions au même poids. Fermée, la question s'écrit en
								    normal ; ouverte, elle prend le medium : c'est la note qui
								    a du poids, pas la liste. */}
								<AccordionTrigger
									headingLevel={3}
									className="text-base font-normal data-panel-open:font-medium sm:text-lg"
								>
									{/* La touche et la question forment UN bloc, sinon le
									    `gap-4` et le `justify-between` du trigger sépareraient
									    la marque de son texte d'un bout à l'autre de la rangée.
									    `items-start` + `mt-1` sur la touche : sur une question
									    qui court sur deux lignes (le cas courant à 390 px), une
									    marque centrée verticalement flotterait entre les deux —
									    elle se pose sur la PREMIÈRE ligne. Les 4 px valent pour
									    les deux crans de texte : (24 − 16) / 2 sous `sm`,
									    (28 − 20) / 2 au-dessus. `min-w-0` : sans lui, un item
									    flex refuse de rétrécir sous la largeur de son contenu
									    et la question déborde au lieu de se replier. */}
									<span className="flex min-w-0 items-start gap-2">
										<FamilyDab />
										{item.question}
									</span>
								</AccordionTrigger>
								{/* La réponse s'aligne sur l'axe du TEXTE de sa question, pas
								    sur celui de la touche : `px-0` neutralise le `px-3` par
								    défaut du panneau (12 px sans intention — lot 0 de l'audit),
								    et le retrait reprend exactement la touche + son `gap-2`
								    (16 + 8 = 24 px sous `sm`, 20 + 8 = 28 px au-dessus).
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
									className="text-muted-foreground px-0 pl-6 text-base leading-relaxed sm:pl-7"
								>
									{item.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>

					{/* La sortie de secours : la FAQ dévie ce qu'elle peut, le reste part
					    en email (cf. `MAILTO_ANCHOR` pour le pourquoi de l'ancre nue).
					    Carte papier + tape ROSE (`MaskingTape`, SSOT — le rose signature,
					    pas de `tint`) : le seul vocabulaire « fait main » que la section
					    porte en dehors du trait. Pas de signature « — Léane » : le
					    storefront ne signe plus nulle part (celle du footer est partie le
					    2026-08-06). */}
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
