import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { cn } from "@/shared/utils/cn";

/**
 * Dernière cellule de l'étal : le passage vers le catalogue complet.
 *
 * @description
 * Un tirage dont la « photo » est la marque elle-même : le rail de quatre
 * couleurs du bloc titre, agrandi à la taille d'une image. Les accents de marque
 * ne tiennent le contraste qu'en APLAT (7,8–12,7:1 sous `--foreground`), jamais
 * en texte — c'est donc le seul registre où les employer en grand.
 *
 * ⚠️ La zone média était un cadre VIDE en pointillés : dans une grille de
 * tirages, à 171×214 px sur mobile, ça se lit comme une image qui n'a pas
 * chargé — alors que c'était alors la seule sortie de l'étal vers le catalogue
 * en dehors de la navbar (audit UI/UX 2026-08-04, P2 ; le bloc titre porte un
 * CTA « Découvrir la boutique » depuis le 2026-08-06). Le libellé « Tout
 * l'étal » est parti avec : le nom INTERNE de la direction de design n'a rien à
 * faire dans la copie client.
 *
 * Un cadre polaroid VIDE (zone média en pointillés, pas de photo) : la cellule
 * appartient à la grille sans se faire passer pour un bijou. Elle est ce qui
 * fait tomber juste le compte de cellules — 5 créations + celle-ci remplissent
 * exactement 2 rangées en `lg` (4 colonnes), 3 en `md`, 3 sous `md`.
 *
 * Le lien vit DANS le cadre, pas autour : `SquiggleUnderline` se dessine sur
 * `group-hover` ET `group-focus-within`, or un focus posé sur un ancêtre du
 * `group` n'est pas « focus-within » de ce group — le trait ne se serait jamais
 * dessiné au clavier (parité WCAG 2.4.7 verrouillée par
 * `hover-focus-parity.regression.test.ts`). Même pattern de stretched link que
 * `ProductCard`.
 *
 * ## Le libellé porte sa PORTÉE, et c'est la règle qui prime
 *
 * « Voir les 48 créations », pas « Voir toutes les créations ». Baymard mesure que
 * **58-59 % des sites** échouent à donner la portée de leurs liens sur mobile, et
 * le mode d'échec est brutal : les visiteuses **lisent la grille comme étant le
 * catalogue entier** (verbatim d'un testeur : « il n'y a que deux paires de
 * chaussures sur ce site »). Une home qui montre cinq pièces sans dire combien il
 * y en a laisse croire qu'elle en montre cinq sur cinq.
 *
 * C'est la seule règle de formulation de CTA qui ait de la recherche derrière
 * elle — les classements de « mots qui convertissent » n'en ont aucune — et à ce
 * volume de commandes aucune formulation ne peut être testée en A/B. On choisit
 * donc par la portée, et on arrête d'en discuter.
 *
 * `totalCount` est optionnel : le repli « Voir toutes les créations » couvre le
 * squelette et tout appelant qui n'aurait pas le compte sous la main. Un compte
 * ABSENT vaut mieux qu'un compte FAUX — annoncer « 5 créations » parce qu'on a
 * compté les cellules serait pire que de ne rien annoncer.
 */
export function HeroAllCreationsCard({ totalCount }: { totalCount?: number }) {
	// Sous 2, le pluriel ment et le chiffre n'apprend rien : « Voir la 1 création »
	// est une phrase cassée, et « Voir les 0 créations » annonce une boutique vide
	// alors que la grille a déjà son propre état vide (`HeroEmptyCard`).
	const label =
		typeof totalCount === "number" && totalCount > 1
			? `Voir les ${totalCount} créations`
			: "Voir toutes les créations";

	return (
		<div
			className={cn(
				CARD_SURFACE_POLAROID,
				CARD_SURFACE_HOVER,
				CARD_SURFACE_FOCUS,
				"motion-safe:can-hover:hover:-translate-y-1 flex flex-col",
			)}
		>
			{/* Le rail de 4 couleurs du bloc titre, à la taille d'une photo.
			    ⚠️ `aspect-4/5` doit rester CELUI de ProductCard : la parité est
			    assertée par `skeleton-card-ratio-parity.regression.test.ts`
			    (`MEDIA_RATIO_MIRRORS`), sinon cette cellule dépareille la rangée
			    le jour où le ratio des cartes change. */}
			<div aria-hidden="true" className="flex aspect-4/5 overflow-hidden rounded-sm">
				<span className="bg-primary flex-1" />
				<span className="bg-brand-lavender flex-1" />
				<span className="bg-brand-mint flex-1" />
				<span className="bg-brand-sun flex-1" />
			</div>

			{/* Légende — l'anatomie d'une ProductCard (eyebrow, titre souligné),
			    même gouttière pour que la rangée reste alignée. */}
			<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					Le catalogue
				</span>

				{/* `/produits` nue, PAS `?sortBy=created-descending` : ce tri est déjà
				    le défaut (`productSortBySchema.default(GET_PRODUCTS_DEFAULT_SORT_BY)`),
				    et `/produits` se canonicalise sur elle-même. Le paramètre faisait
				    pointer le lien interne le plus fort du site vers une URL qui se
				    canonicalise ailleurs, pour un résultat identique. */}
				<Link
					href="/produits"
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<span className="relative block">
						{/* Flèche INLINE, pas un frère en flex : sur une cellule de 171 px
						    le libellé passe sur deux lignes, et une flèche en flex se
						    retrouve centrée verticalement à côté du bloc au lieu de suivre
						    le dernier mot. */}
						<span className="font-display text-foreground text-base sm:text-lg">
							{label}
							<ArrowRightIcon
								aria-hidden="true"
								className="can-hover:group-hover:translate-x-1 ml-1.5 inline size-4 align-[-0.1em] ease-out motion-safe:transition-transform motion-safe:duration-300"
							/>
						</span>
						{/* `w-full` : le défaut `w-20` (80 px) ne couvrirait qu'environ la
						    moitié de « Voir toutes les créations ». Même correctif que
						    ProductCard et CollectionCard. */}
						<SquiggleUnderline className="w-full" />
					</span>
				</Link>
			</div>
		</div>
	);
}
