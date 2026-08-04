import { Suspense } from "react";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { BRAND } from "@/shared/constants/brand";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Les quatre accents de marque, dans l'ordre du rail de la page d'accueil.
 *
 * Ce sont des APLATS et rien d'autre : sur `--background`, aucun des quatre ne
 * dépasse 2,5:1, donc aucun ne peut porter du texte. Sous `--foreground`, ils
 * donnent 7,8 à 12,7:1 — c'est le seul registre où les employer.
 */
const RAIL_ACCENTS = ["bg-primary", "bg-brand-lavender", "bg-brand-mint", "bg-brand-sun"] as const;

/**
 * Couleur d'une page de type, dérivée de son slug.
 *
 * Il n'existe pas de couleur par type en base, et en ajouter une serait un champ
 * de plus à remplir pour chaque catégorie. Une somme des points de code donne un
 * accent STABLE (le slug ne change pas — il porte l'URL indexée) et réparti,
 * sans migration ni saisie.
 */
function accentForSlug(slug: string): string {
	let sum = 0;
	for (let i = 0; i < slug.length; i++) sum += slug.charCodeAt(i);
	return RAIL_ACCENTS[sum % RAIL_ACCENTS.length]!;
}

async function CatalogCount({
	productsPromise,
	activeProductType,
}: {
	productsPromise: Promise<GetProductsReturn>;
	activeProductType?: { label: string };
}) {
	const { totalCount } = await productsPromise;

	if (totalCount === 0) return null;

	const noun = totalCount > 1 ? "pièces" : "pièce";
	const suffix = activeProductType
		? `${noun} dans cette famille.`
		: `${noun} en ligne en ce moment.`;

	return (
		<>
			<span className="text-foreground font-semibold tabular-nums">{totalCount}</span> {suffix}
		</>
	);
}

export type CatalogHeadingProps = {
	/** Titre de la page — terme recherché, libellé du type, ou « Les créations ». */
	title: string;
	/** Promesse du catalogue : le compte est streamé, le `h1` ne l'attend jamais. */
	productsPromise: Promise<GetProductsReturn>;
	/** Type filtré, sur une page catégorie. */
	activeProductType?: { slug: string; label: string; description?: string | null };
	/** Terme recherché : la copie d'atelier laisse alors la place au contexte de recherche. */
	searchTerm?: string;
};

/**
 * Bloc titre du catalogue — la PREMIÈRE CELLULE de la grille des créations.
 *
 * @description
 * Direction « L'étal continue » (artifact du 2026-08-05, reco B) : le catalogue
 * n'a plus de bande d'en-tête. Son titre est une cellule de la grille, comme sur
 * la page d'accueil (`etal-heading.tsx`) — on ne franchit pas une frontière entre
 * la boutique et son catalogue, on continue de descendre le même étal.
 *
 * ## Ce que la structure garantit
 *
 * - **Le `h1` est VISIBLE à tous les viewports.** L'ancien montage masquait le
 *   `PageHeader` sous `sm` et laissait un `h1` `sr-only` — un contournement qui
 *   reposait sur un onglet « Produits » en bottom-nav, retiré depuis (audit
 *   recherche 2026-07-26). La page n'affichait alors plus un seul mot en mobile.
 * - **Le `h1` ne dépend d'AUCUN `await`.** Seul le compte est derrière une
 *   frontière `Suspense` : la lecture catalogue ne peut pas retarder l'élément
 *   qui porte le LCP, et c'est pour lui que Fraunces est préchargée.
 * - **Le bloc n'a ni cadre, ni fond, ni ruban** — c'est du texte posé sur le
 *   papier, à côté des tirages. C'est ce qui l'empêche de se lire comme une carte
 *   de plus au milieu de la grille.
 *
 * ## Budget vertical
 *
 * ≈ 175 px à 390 px de large, contre ~290 px sur la page d'accueil : pas de chapô
 * sous `sm`, pas de signature, un titre de deux mots. C'est ce budget qui garde
 * deux pièces ENTIÈRES au-dessus de la bottom-nav sur un écran de 844 px. Si la
 * copie s'allonge, c'est elle qui cède — pas le budget.
 *
 * ⚠️ Copie au TUTOIEMENT et à la première personne. `docs/atelier-story.md`
 * vouvoie : c'est une réserve de copie, pas un texte prêt à poser.
 */
export function CatalogHeading({
	title,
	productsPromise,
	activeProductType,
	searchTerm,
}: CatalogHeadingProps) {
	return (
		// `col-span-*` : le bloc prend la largeur entière sous `lg`, et ne partage
		// sa rangée qu'à partir de `lg` (2 colonnes de titre + 2 de tirages) —
		// même calibrage que `etal-grid.tsx`.
		// `lg:pt-2` aligne optiquement le bloc sur la marge blanche des cadres voisins.
		<div className="col-span-2 pb-1 sm:pb-2 md:col-span-3 lg:col-span-2 lg:pt-2 lg:pb-0">
			<p className="text-muted-foreground text-[0.8125rem] tracking-[0.09em] uppercase">
				L&apos;atelier de Léane · {BRAND.contact.location.city}
			</p>

			{/* Le rail : les accents de marque en aplat. Sur une page de type, il se
			    réduit à un seul segment — la couleur de la famille — pour que la
			    catégorie ait une identité sans ajouter un champ en base.
			    Purement décoratif : le titre porte déjà tout le sens. */}
			<div aria-hidden="true" className="mt-2 mb-3 flex sm:mt-2.5 sm:mb-4">
				{activeProductType ? (
					<span
						className={`${accentForSlug(activeProductType.slug)} h-1.5 w-32 rounded-full sm:w-36 lg:w-44`}
					/>
				) : (
					RAIL_ACCENTS.map((accent, index) => (
						<span
							key={accent}
							className={`${accent} h-1.5 w-8 sm:w-9 lg:w-11 ${
								index === 0 ? "rounded-l-full" : ""
							} ${index === RAIL_ACCENTS.length - 1 ? "rounded-r-full" : ""}`}
						/>
					))
				)}
			</div>

			{/* -ml-[0.055em] : correction OPTIQUE. La panse du « L » de Fraunces recule
			    à l'œil ; aligner le glyphe mathématiquement sur le bord des cadres se
			    voit décalé à droite. Reprise de `etal-heading.tsx`.
			    L'échelle reste SOUS le `clamp(2.5rem, 4.6vw, 4rem)` de la page
			    d'accueil : c'est une page fille, elle ne crie pas plus fort que sa mère. */}
			<h1 className="font-display wrap-break-words -ml-[0.055em] text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.06] font-light tracking-[-0.02em]">
				{title}
			</h1>

			{/* Trois copies possibles, une seule rendue. La description d'atelier est
			    masquée sous `sm` : c'est le budget vertical mobile qui la coupe, et
			    `display: none` la retire aussi de l'arbre d'accessibilité — donc pas de
			    lecture en double. */}
			<p className="text-muted-foreground mt-2.5 max-w-[42ch] text-[0.9375rem] leading-relaxed sm:mt-3 sm:text-base">
				{searchTerm
					? "Voici ce que j'ai trouvé dans l'atelier."
					: (activeProductType?.description ?? (
							<span className="hidden sm:inline">
								Je peins et j&apos;assemble chaque pièce à la main, dans mon atelier à{" "}
								{BRAND.contact.location.city}. Aucune n&apos;est identique à une autre.
							</span>
						))}
			</p>

			{/* Le compte est la seule information qui change d'un jour à l'autre : il
			    mérite sa ligne, pas un gris de 14 px sous les filtres. Sa frontière
			    `Suspense` est ce qui garde le `h1` hors de toute attente. */}
			<p className="text-muted-foreground mt-2 text-[0.9375rem] sm:text-base">
				{/* `as="span"` : un `<div>` ici est un descendant illégal du `<p>`, refermé
				    par le parser — erreur d'hydratation React. */}
				<Suspense
					fallback={<Skeleton as="span" className="inline-block h-4 w-44 rounded align-[-2px]" />}
				>
					<CatalogCount productsPromise={productsPromise} activeProductType={activeProductType} />
				</Suspense>
			</p>

			{/* Sacramento (--font-cursive) est réservée au décoratif : une signature en
			    fait partie. Ni font-bold ni italic (mono-poids, script déjà incliné).
			    Masquée sous `sm` — c'est le budget vertical mobile qui la coupe. */}
			<p className="font-cursive mt-3 hidden text-[1.75rem] leading-none sm:block">— Léane</p>

			{/* Le seul titre visible est le `h1` ; les cartes portent des `h3`. Ce `h2`
			    masqué comble le saut de niveau (WCAG 1.3.1) sans ajouter un titre de
			    section que la direction ne veut pas — les bijoux SONT l'annonce.
			    Il est en FIN de bloc : un `h2` avant le `h1` serait une hiérarchie
			    inversée, pas une hiérarchie comblée. */}
			<h2 className="sr-only">Liste des créations</h2>
		</div>
	);
}

/**
 * Miroir du bloc titre pour `ProductCatalogSkeleton`.
 *
 * Le `h1` réel n'attend rien, donc ce miroir n'est utilisé que par le
 * `loading.tsx` de la route — où la donnée du titre n'est pas encore là.
 */
export function CatalogHeadingSkeleton() {
	return (
		<div className="col-span-2 pb-1 sm:pb-2 md:col-span-3 lg:col-span-2 lg:pt-2 lg:pb-0">
			<Skeleton className="h-4 w-48 rounded" />
			<div className="mt-2 mb-3 flex sm:mt-2.5 sm:mb-4">
				{RAIL_ACCENTS.map((accent) => (
					<span key={accent} className={`${accent} h-1.5 w-8 opacity-40 sm:w-9 lg:w-11`} />
				))}
			</div>
			<Skeleton className="h-9 w-64 rounded sm:h-11 lg:h-12" />
			<Skeleton className="mt-3 hidden h-5 w-80 max-w-full rounded sm:block" />
			<Skeleton className="mt-2 h-5 w-44 rounded" />
		</div>
	);
}
