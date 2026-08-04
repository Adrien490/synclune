import { BRAND } from "@/shared/constants/brand";

/**
 * Bloc titre de l'étal — la PREMIÈRE CELLULE de la grille des créations.
 *
 * @description
 * Direction « L'étal » (artifact hero du 2026-08-04, reco C) : il n'y a pas de
 * bande hero au-dessus du catalogue. Le titre est une cellule de la grille, et
 * la première chose visible sous la barre est un bijou, pas un slogan. Le bloc
 * n'a donc ni cadre, ni fond, ni ruban — c'est du texte posé sur le papier, à
 * côté des tirages : c'est ce qui l'empêche de ressembler à une carte de plus.
 *
 * Server Component, zéro JS client. Le `<h1>` est du texte rendu côté serveur
 * et ne dépend d'AUCUN `await` (cf. `EtalSection`, qui isole la grille derrière
 * un `Suspense`) : c'est lui qui porte le LCP, et c'est pour lui seul que
 * Fraunces est préchargée (`shared/styles/fonts.ts`).
 *
 * Trois greffons documentés dans l'artifact :
 * - le rail de 4 couleurs vient de la direction A (« Le nuancier »), réduit
 *   d'une réglette de pastilles à un signe de 6 px ;
 * - la ligne « — Léane » vient de la direction D (« Le petit mot »), qui suffit
 *   à dire qu'il y a quelqu'un derrière sans faire lire un paragraphe ;
 * - la copie mobile est plus courte que la copie desktop, les deux dans le DOM
 *   (choix UX délibéré et documenté de l'ancienne home). Une seule est rendue à
 *   la fois : `display: none` la retire aussi de l'arbre d'accessibilité, donc
 *   pas de double lecture.
 *
 * ⚠️ Copie au TUTOIEMENT et à la première personne. Elle est RÉÉCRITE, pas
 * recopiée de `docs/atelier-story.md`, qui vouvoie (« Je vais vous faire une
 * confidence ») — la recopier réintroduirait le défaut de voix mixte corrigé
 * sur le tunnel de paiement (`checkout-voice-tutoiement.regression.test.ts`).
 */
export function EtalHeading({ id }: { id: string }) {
	return (
		// lg:pt-2 aligne optiquement le bloc sur la marge blanche des cadres
		// voisins ; le padding bas ne sert que tant que le bloc est EMPILÉ
		// au-dessus de la grille (< lg), où le gap seul serre trop.
		<div className="pb-2 sm:pb-4 lg:pt-2 lg:pb-0">
			<p className="text-muted-foreground text-[0.8125rem] tracking-[0.09em] uppercase">
				L&apos;atelier de Léane · {BRAND.contact.location.city}
			</p>

			{/* Rail de 4 couleurs — les accents de marque en APLAT, seul registre
			    où ils tiennent le contraste (7,8–12,7:1 sous --foreground).
			    Purement décoratif : le titre porte déjà tout le sens.

			    Le rythme se resserre sous 40rem (ici comme sur le chapô et la
			    signature) : c'est le budget vertical du bloc titre — ≈ 290 px du
			    bas de la barre au haut du premier cadre, à 390 px de large — qui
			    garantit deux pièces ENTIÈRES au-dessus de la barre du bas sur un
			    écran de 844 px. Si la copie s'allonge, c'est elle qui cède, pas
			    le budget (verrouillé par `e2e/shop-mobile.spec.ts`). */}
			<div aria-hidden="true" className="mt-2 mb-4 flex sm:mt-2.5 sm:mb-6">
				<span className="bg-primary h-1.5 w-8 rounded-l-full sm:w-9 lg:w-11" />
				<span className="bg-brand-lavender h-1.5 w-8 sm:w-9 lg:w-11" />
				<span className="bg-brand-mint h-1.5 w-8 sm:w-9 lg:w-11" />
				<span className="bg-brand-sun h-1.5 w-8 rounded-r-full sm:w-9 lg:w-11" />
			</div>

			{/* -ml-[0.055em] : correction OPTIQUE, pas un décalage. La panse du
			    « D » de Fraunces recule à l'œil ; aligner le glyphe
			    mathématiquement sur le bord des cadres se voit décalé à droite.

			    `md:max-w-[20ch] lg:max-w-none` borne la MESURE dans la seule
			    plage où elle dérape : entre 48rem et ~54rem, le clamp est collé
			    à son plancher de 40 px pendant que la cellule titre passe en
			    pleine largeur (3 colonnes) — le titre tenait alors sur une seule
			    ligne de 35 caractères et se lisait comme une bannière, perdant
			    la silhouette en deux lignes qu'il a à 390 comme à 1280. La borne
			    est inopérante sous `md` (20ch ≈ 400 px > la colonne) et levée à
			    `lg` pour ne pas déplacer la césure desktop. */}
			<h1
				id={id}
				className="font-display -ml-[0.055em] text-[clamp(2.5rem,4.6vw,4rem)] leading-[1.02] font-light tracking-[-0.02em] md:max-w-[20ch] lg:max-w-none"
			>
				Des bijoux <span className="text-gradient-multicolor">colorés</span>, faits un par un
			</h1>

			<p className="mt-4 hidden max-w-[40ch] text-[1.0625rem] leading-[1.65] sm:mt-6 sm:block">
				Je peins et j&apos;assemble chaque pièce à la main, dans mon atelier à{" "}
				{BRAND.contact.location.city}. Aucune n&apos;est identique à une autre.
			</p>
			<p className="mt-4 max-w-[40ch] text-[1.0625rem] leading-[1.65] sm:hidden">
				Je peins et j&apos;assemble chaque pièce à la main, à {BRAND.contact.location.city}.
			</p>

			{/* Sacramento (--font-cursive) est réservée au décoratif : une
			    signature en fait partie. Ni font-bold ni italic (mono-poids,
			    script déjà incliné). */}
			<p className="font-cursive mt-2.5 text-[1.625rem] leading-none sm:mt-4 sm:text-[1.875rem]">
				— Léane
			</p>

			{/* Le seul titre visible de l'étal est le `h1` ; les cartes portent des
			    `h3`. Ce `h2` masqué comble le saut de niveau pour les lecteurs
			    d'écran sans ajouter un titre de section que la direction retenue
			    ne veut justement pas (les bijoux SONT l'annonce).
			    Il est en FIN de bloc titre : un `h2` avant le `h1` dans l'ordre
			    DOM serait une hiérarchie inversée, pas une hiérarchie comblée. */}
			<h2 className="sr-only">Dernières créations</h2>
		</div>
	);
}
