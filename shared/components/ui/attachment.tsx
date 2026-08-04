import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

/**
 * Carte de fichier joint : média, nom, métadonnée, état d'envoi et actions.
 *
 * Vendored depuis le registre shadcn/ui (`attachment`), avec quatre écarts
 * assumés par rapport à l'amont :
 *
 * 1. Le remplacement d'élément passe par `render` (Base UI `useRender`) et non
 *    par le `asChild` du `Slot` Radix : c'est la convention vers laquelle le kit
 *    du repo migre, cf. `button.tsx`. ⚠️ Corollaire du même `useRender` : les
 *    enfants restent portés par le composant, pas par l'élément passé.
 * 2. Le survol est gaté par `can-hover:` — sans lui, iOS colle l'état hover
 *    après un tap (convention repo, cf. CLAUDE.md § Survol vs focus).
 * 3. `AttachmentAction` ne peut pas s'appuyer sur la taille `icon-xs` de l'amont
 *    (le `Button` maison n'a que `icon`, 44px) : il rend une cible visuelle de
 *    28px étendue à 44px par un pseudo-élément, comme les autres boutons icône
 *    compacts du repo. ⚠️ L'extenseur déborde de 8px de CHAQUE côté : deux
 *    actions adjacentes verraient celui de la seconde recouvrir 8px du CORPS de
 *    la première (même `z-index` auto, l'ordre de peinture suit le DOM), soit
 *    29 % de sa largeur tactile. D'où la gouttière conditionnelle posée par
 *    `AttachmentActions`. À garder en tête avant de retoucher l'extenseur : à
 *    28px la cible satisfait DÉJÀ WCAG 2.5.8 (AA, 24×24) sans lui — il ne sert
 *    que le 2.5.5 (AAA), qu'il ne faut pas payer d'une régression du AA.
 * 4. PAS de `AttachmentGroup` (l'amont en a un) : il serait un conteneur de
 *    défilement, or `ScrollFade` en est déjà un — les emboîter neutralise le
 *    fondu (son `ResizeObserver` ne voit plus aucun débordement, les overlays
 *    restent à `opacity-0`) ET l'annonce `aria-live` « Faites défiler pour voir
 *    plus de contenu ». Une rangée de pièces jointes s'écrit donc :
 *
 *      <ScrollFade scrollRegionLabel="Pièces jointes">
 *        <div className="flex snap-x snap-mandatory gap-3 *:flex-none *:snap-start">
 *
 *    ⚠️ `scrollRegionLabel` n'y est pas cosmétique : il pose `role="region"` +
 *    `tabIndex={0}`, seul moyen d'atteindre au clavier des pièces jointes
 *    PRÉSENTATIONNELLES hors écran (amont, § Keyboard scrolling). L'omettre
 *    quand chaque carte porte un trigger ou des actions — celles-ci sont déjà
 *    dans l'ordre de tabulation, un arrêt de plus serait redondant.
 */

// `has-[:focus-visible]` et non `focus-within` : ce dernier n'a pas de pendant
// `:focus-visible` en CSS, donc il matche aussi au CLIC — cliquer une action
// peignait un halo autour de la carte jusqu'au blur, et au clavier on obtenait
// deux anneaux concentriques (celui du bouton, 3px via `focus-ring`, plus
// celui-ci). Corollaire : la SSOT `focus-ring-ssot.regression.test.ts` ne
// cherche que `focus-visible:ring-…`, elle ne voyait pas la variante `within`.
const attachmentVariants = cva(
	"group/attachment bg-card text-card-foreground has-[:focus-visible]:ring-ring/50 can-hover:has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border transition-colors has-[:focus-visible]:ring-1",
	{
		variants: {
			size: {
				default:
					"has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2 gap-2 text-sm",
				sm: "has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5 gap-2.5 text-xs",
				xs: "has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1 gap-1.5 rounded-lg text-xs",
			},
			orientation: {
				horizontal: "min-w-40 items-center",
				vertical: "has-data-[slot=attachment-content]:w-30 w-24 flex-col",
			},
		},
		defaultVariants: {
			size: "default",
			orientation: "horizontal",
		},
	},
);

/** État du cycle de vie de la pièce jointe — pilote la couleur et le balayage du titre. */
type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

function Attachment({
	className,
	state = "done",
	size = "default",
	orientation = "horizontal",
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof attachmentVariants> & {
		state?: AttachmentState;
	}) {
	return (
		<div
			data-slot="attachment"
			data-state={state}
			data-size={size}
			data-orientation={orientation}
			className={cn(attachmentVariants({ size, orientation }), className)}
			{...props}
		/>
	);
}

const attachmentMediaVariants = cva(
	// `**:` (tout descendant) et non `*:` (enfant direct) pour le spinner :
	// `Spinner` ne pose `data-slot="spinner"` que sur son `<svg>`, qu'il enveloppe
	// dans un `<span role="status">` sauf en mode `presentational`. Avec `*:` la
	// règle ne s'appliquait qu'au cas `presentational`, en silence.
	"bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive group-data-[orientation=vertical]/attachment:**:data-[slot=spinner]:size-6! relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5",
	{
		variants: {
			variant: {
				icon: "",
				image:
					"group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 opacity-60 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
			},
		},
		defaultVariants: {
			variant: "icon",
		},
	},
);

function AttachmentMedia({
	className,
	variant = "icon",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>) {
	return (
		<div
			data-slot="attachment-media"
			data-variant={variant}
			className={cn(attachmentMediaVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="attachment-content"
			className={cn(
				"max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="attachment-title"
			className={cn(
				"group-data-[state=processing]/attachment:motion-safe:shimmer-text group-data-[state=uploading]/attachment:motion-safe:shimmer-text block max-w-full min-w-0 truncate font-medium",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="attachment-description"
			className={cn(
				"text-muted-foreground group-data-[state=error]/attachment:text-destructive/80 mt-0.5 block max-w-full min-w-0 truncate text-xs",
				className,
			)}
			{...props}
		/>
	);
}

function AttachmentActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="attachment-actions"
			className={cn(
				// La gouttière n'apparaît qu'à partir de la SECONDE action : 16px,
				// exactement de quoi absorber les deux extenseurs tactiles de 8px
				// (cf. écart 3 en tête de fichier). Le cas nominal — une action —
				// ne paie donc aucune largeur.
				"relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 has-[>*:nth-child(2)]:gap-4",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Bouton d'action (retirer, annuler, réessayer…). Icône seule : `aria-label`
 * obligatoire — `Button` avertit en dev quand il manque.
 *
 * À la taille par défaut : cible visuelle 28px, zone tactile portée à 44px par
 * un `::after` invisible. Passer une `size` explicite rend un `Button` normal
 * (déjà ≥ 36px, l'extenseur n'aurait plus d'objet). Cf. l'écart 3 en tête de
 * fichier pour la contrainte sur les actions multiples.
 *
 * ⚠️ `type="button"` par défaut, et non hérité de `Button` qui n'en pose aucun :
 * une pièce jointe vit souvent DANS un formulaire (téléversement de médias
 * produit), où un bouton sans `type` vaut `submit` — retirer un fichier
 * enverrait le formulaire.
 */
function AttachmentAction({
	className,
	variant,
	size,
	type,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			data-slot="attachment-action"
			type={type ?? "button"}
			variant={variant ?? "ghost"}
			size={size ?? "icon"}
			className={cn(
				// La cible compacte n'est posée QUE quand l'appelant laisse la taille
				// par défaut. `size-7` vit dans le `className`, que cva concatène en
				// DERNIER : il battait donc la classe de hauteur du variant, et
				// `size="sm"` rendait un bouton de 28px portant le padding d'un `sm`.
				// L'extenseur tactile suit la même règle — il n'a de sens que sous le
				// plancher de 44px.
				size === undefined &&
					"relative size-7 rounded-full after:absolute after:-inset-2 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Surface pleine carte qui active la pièce jointe (ouvrir un lien, une dialog).
 * Rendue SOUS les actions dans l'ordre d'empilement (`z-10` vs `z-20`) : les
 * deux restent cliquables et focusables séparément.
 *
 * Remplacer l'élément rendu via `render` — typiquement un lien :
 * `<AttachmentTrigger render={<a href={url} aria-label="Ouvrir…" />} />`.
 *
 * @public Surface du kit shadcn/ui vendored — exempté du rapport knip.
 */
function AttachmentTrigger({
	className,
	render,
	type,
	...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		render,
		props: mergeProps<"button">(
			{
				// `type="button"` sur un `<a>` en ferait un attribut de type MIME
				// (`type="text/html"`), pas un rôle de bouton : on ne le pose que
				// lorsque l'élément rendu est bien le `<button>` par défaut.
				type: render ? undefined : (type ?? "button"),
				// `rounded-[inherit]`, jamais un radius en dur : la racine descend à
				// `rounded-lg` en `size="xs"`, et le halo de `focus-ring` (3px) suit
				// le `border-radius` — figé à `rounded-xl` il débordait les coins.
				className: cn("focus-ring absolute inset-0 z-10 rounded-[inherit]", className),
			},
			props,
		),
		state: { slot: "attachment-trigger" },
	});
}

export {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
	AttachmentTrigger,
	type AttachmentState,
};
