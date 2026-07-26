import { cn } from "@/shared/utils/cn";
import * as React from "react";

interface DetailInfoListProps extends React.ComponentProps<"dl"> {
	/**
	 * `row` : libellé à gauche, valeur à droite (`justify-between`). Convient aux
	 * valeurs courtes — statut, montant, date.
	 *
	 * `stacked` : libellé au-dessus de la valeur. Nécessaire dès que la valeur peut
	 * être longue et insécable (identifiant Stripe `pi_…`, numéro de suivi, URL) :
	 * en `row` elle déborderait ou écraserait le libellé.
	 *
	 * @default "row"
	 */
	orientation?: "row" | "stacked";
}

/**
 * Nom du groupe Tailwind par lequel `DetailInfoRow` lit l'orientation de sa liste.
 *
 * **Pourquoi du CSS et pas un Context React** : ces listes sont rendues par des
 * pages de détail admin qui sont des Server Components. Un `createContext` y lève
 * `createContext is not a function` au `collect page data` du build, et le rendre
 * client aurait basculé tout le sous-arbre (donc son JS) côté navigateur pour une
 * simple décision de mise en page. Le sélecteur descendant fait le même travail à
 * zéro JS — et fonctionne à n'importe quelle profondeur d'imbrication, ce que le
 * Context ne garantissait pas mieux.
 */
const INFO_LIST_GROUP = "group/info-list";

/**
 * Liste de paires libellé/valeur des pages de détail admin.
 *
 * Existe pour unifier les **trois grammaires** qui coexistaient pour la même notion :
 * `<dl>/<dt>/<dd>` horizontal (remboursement, client) et paires `<p>/<p>` empilées
 * non sémantiques (commande). Les deux orientations sont conservées — ce sont de
 * vrais choix de mise en page, pas une divergence — mais le balisage est désormais
 * sémantique partout (`<dl>` associe explicitement libellé et valeur pour les
 * lecteurs d'écran, ce que deux `<p>` frères ne font pas).
 */
export function DetailInfoList({
	orientation = "row",
	className,
	children,
	...props
}: DetailInfoListProps) {
	return (
		<dl
			data-orientation={orientation}
			className={cn(
				INFO_LIST_GROUP,
				orientation === "row" ? "grid gap-3 text-sm" : "space-y-3",
				className,
			)}
			{...props}
		>
			{children}
		</dl>
	);
}

interface DetailInfoRowProps {
	label: React.ReactNode;
	children: React.ReactNode;
	/** Classes appliquées à la valeur (`<dd>`), ex. `font-medium`, `capitalize`. */
	valueClassName?: string;
	/**
	 * Classes appliquées au libellé (`<dt>`), à la place de la taille par défaut.
	 * Utile pour les sous-blocs plus denses (ex. l'encart « avoir comptable » en
	 * `text-xs`).
	 */
	labelClassName?: string;
	/**
	 * Alignement vertical en orientation `row`. `start` est requis quand la valeur
	 * peut passer à la ligne (email, n° de commande en `break-all`) : en `center` le
	 * libellé se retrouverait centré sur plusieurs lignes de valeur.
	 *
	 * @default "center"
	 */
	align?: "center" | "start";
	className?: string;
}

/** Une paire libellé/valeur. Doit être rendue dans un `<DetailInfoList>`. */
export function DetailInfoRow({
	label,
	children,
	valueClassName,
	labelClassName,
	align = "center",
	className,
}: DetailInfoRowProps) {
	return (
		<div
			className={cn(
				"group-data-[orientation=row]/info-list:flex group-data-[orientation=row]/info-list:justify-between group-data-[orientation=row]/info-list:gap-3",
				align === "start"
					? "group-data-[orientation=row]/info-list:items-start"
					: "group-data-[orientation=row]/info-list:items-center",
				className,
			)}
		>
			<dt
				className={cn(
					"text-muted-foreground",
					// En `row` la taille est héritée du `<dl>` ; seul `stacked` la porte ici.
					!labelClassName && "group-data-[orientation=stacked]/info-list:text-sm",
					labelClassName,
				)}
			>
				{label}
			</dt>
			<dd className={valueClassName}>{children}</dd>
		</div>
	);
}
