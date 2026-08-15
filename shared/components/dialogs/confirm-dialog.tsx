"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	type AlertActionTone,
} from "@/shared/components/ui/alert-dialog";

type ConfirmDialogBaseProps = {
	open: boolean;
	/**
	 * Fermeture demandée : Annuler, Échap, retour matériel — **et le clic sur la
	 * confirmation**, qui ferme le dialog avant que la mutation ne démarre
	 * (`alert-dialog-close-on-confirm.regression.test.tsx`).
	 *
	 * L'appelant n'a donc RIEN à fermer depuis son `onSuccess` : c'est déjà fait.
	 * Il y garde ce qui lui appartient — navigation, remise à zéro d'un champ.
	 */
	onClose: () => void;

	title: ReactNode;
	/**
	 * Prose de la confirmation. Rendue dans un `<div>` et jamais dans un `<p>` :
	 * la moitié des appelants y placent leurs propres `<p>`, et un `<p>` imbriqué
	 * est une erreur d'hydratation.
	 */
	description: ReactNode;
	/**
	 * Classes du conteneur de description — en pratique l'espacement vertical
	 * (`space-y-3`, `space-y-4`) que 7 confirmations posaient sur leur `render`.
	 * Sans cette échappatoire, la migration les aplatirait sans qu'un test le voie.
	 */
	descriptionClassName?: string;
	/** Contenu additionnel rendu DANS le formulaire, entre la description et le footer. */
	children?: ReactNode;
	/** Champs cachés du formulaire. `null`/`undefined` deviennent `""`. */
	fields?: Record<string, string | number | null | undefined>;

	confirmLabel: string;
	/** @default "Annuler" */
	cancelLabel?: string;
	tone?: AlertActionTone;
	/**
	 * Désactive la confirmation.
	 *
	 * ⚠️ C'est le SEUL mécanisme de validation admis ici. Une contrainte HTML
	 * (`required`, `minLength`) posée dans `children` ne peut pas être rapportée à
	 * l'utilisatrice : le dialog a déjà disparu quand le navigateur bloque la
	 * soumission, et elle voit une confirmation qui se ferme sans rien faire.
	 */
	confirmDisabled?: boolean;
	/**
	 * Accusé de réception à un seul bouton (pas d'annulation possible).
	 *
	 * ⚠️ Interdit sur une action destructive : sans Cancel, le focus initial
	 * atterrit sur la confirmation, et une pression sur Entrée juste après
	 * l'ouverture déclenche l'action — exactement le garde-fou que l'ordre DOM
	 * Cancel→Action existe pour préserver.
	 */
	hideCancel?: boolean;
	/**
	 * ⚠️ Pas de prop `trigger` — et ce n'est pas un oubli. `open`/`onClose` fait de
	 * ce composant une surface strictement CONTRÔLÉE : un `AlertDialogTrigger`
	 * interne demanderait l'ouverture à un `onOpenChange(true)` que personne
	 * n'écoute, et le bouton serait inerte sans la moindre erreur. Le déclencheur
	 * appartient donc à l'appelante, qui possède déjà l'état — un simple
	 * `onClick={() => setOpen(true)}`. Base UI rend le focus à l'élément
	 * précédemment actif, donc rien n'est perdu côté a11y.
	 */
	contentClassName?: string;
	confirmClassName?: string;
	cancelClassName?: string;
	/** Pour un `viewTransitionName` porté par le bouton — sans lui la transition meurt en silence. */
	confirmStyle?: CSSProperties;
};

/**
 * Trois modes de soumission, mutuellement exclusifs et vérifiés par le compilateur.
 * C'est cette union qui remplace le `hiddenFields` de l'ancien
 * `DeleteConfirmationDialog` : elle ne présuppose rien de la forme des données de
 * l'appelant, ce qui est précisément ce qui le rendait inutilisable ailleurs.
 */
export type ConfirmDialogProps =
	/** Cas nominal : `<form action={formAction}>` d'un hook `useActionState`. */
	| (ConfirmDialogBaseProps & {
			action: (formData: FormData) => void;
			onSubmit?: never;
			onConfirm?: never;
	  })
	/** Soumission maison (panier : mise à jour optimiste avant l'action). */
	| (ConfirmDialogBaseProps & {
			onSubmit: (event: FormEvent<HTMLFormElement>) => void;
			action?: never;
			onConfirm?: never;
	  })
	/** Pas de formulaire du tout : un bouton, un handler. */
	| (ConfirmDialogBaseProps & {
			onConfirm: () => void;
			action?: never;
			onSubmit?: never;
	  });

/**
 * Confirmation standard : un titre, une prose, Annuler + une action.
 *
 * Ce composant possède le CHROME (structure, ordre a11y Cancel→Action, garde de
 * fermeture, description en `<div>`) ; l'appelant possède son FORMULAIRE et son
 * état d'ouverture. C'est la répartition qui manquait à `DeleteConfirmationDialog`,
 * lequel exigeait le store et un `<form action>` — d'où ses 3 appelants sur 26.
 *
 * **Quand ne PAS l'utiliser** — descendre aux primitives `ui/alert-dialog` si l'un
 * de ces trois invariants est faux :
 *   1. un seul écran (l'ouverture et la confirmation portent le même contenu) ;
 *   2. exactement deux boutons, dans l'ordre Annuler puis Confirmer ;
 *   3. tout le contenu vit dans le formulaire (rien au-dessus du titre) ;
 *   4. l'ouverture est pilotée du DEHORS — un composant qui expose son propre
 *      déclencheur (`AlertDialogTrigger`) reste aux primitives, cf. la note sur
 *      l'absence de prop `trigger` ci-dessus (`logout-alert-dialog`).
 *
 * Les primitives sont une destination légitime, pas un échec : les confirmations
 * à deux écrans ou multi-étapes y restent.
 *
 * @example
 * <ConfirmDialog
 *   open={dialog.isOpen}
 *   onClose={dialog.close}
 *   action={action}
 *   tone="success"
 *   fields={{ id: dialog.data?.orderId }}
 *   title="Confirmer la livraison"
 *   confirmLabel="Marquer comme livrée"
 *   description={<p>Marquer la commande {dialog.data?.orderNumber} comme livrée ?</p>}
 * />
 */
export function ConfirmDialog({
	open,
	onClose,
	title,
	description,
	descriptionClassName,
	children,
	fields,
	confirmLabel,
	cancelLabel = "Annuler",
	tone,
	confirmDisabled,
	hideCancel,
	contentClassName,
	confirmClassName,
	cancelClassName,
	confirmStyle,
	action,
	onSubmit,
	onConfirm,
}: ConfirmDialogProps) {
	const body = (
		<>
			{fields &&
				Object.entries(fields).map(([name, value]) => (
					<input key={name} type="hidden" name={name} value={value ?? ""} />
				))}

			<AlertDialogHeader>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription render={<div className={descriptionClassName} />}>
					{description}
				</AlertDialogDescription>
			</AlertDialogHeader>

			{children}

			<AlertDialogFooter>
				{!hideCancel && (
					<AlertDialogCancel type="button" className={cancelClassName}>
						{cancelLabel}
					</AlertDialogCancel>
				)}
				<AlertDialogAction
					type={onConfirm ? "button" : "submit"}
					tone={tone}
					disabled={confirmDisabled}
					className={confirmClassName}
					style={confirmStyle}
					onClick={(event) => {
						if (onConfirm) {
							onConfirm();
							return;
						}
						// ⚠️ Le `Close` Base UI AVALE la soumission native au navigateur :
						// le clic fermait le dialog sans que le `<form action>` ne parte —
						// TOUTES les confirmations (expédier, annuler, rejeter, supprimer)
						// étaient inertes, sans erreur ni toast. Invisible en JSDOM (le
						// test de régression passait) ; constaté au clic-through
						// Playwright du lot 7. `preventDefault` + `requestSubmit` rend la
						// soumission explicite et UNIQUE quel que soit l'environnement —
						// la fermeture au clic (contrat documenté) est préservée.
						event.preventDefault();
						event.currentTarget.closest("form")?.requestSubmit();
					}}
				>
					{confirmLabel}
				</AlertDialogAction>
			</AlertDialogFooter>
		</>
	);

	return (
		<AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
			<AlertDialogContent className={contentClassName}>
				{onConfirm ? (
					body
				) : (
					// Un `<form>` sans nom accessible n'expose même pas `role="form"`.
					// Le titre le nomme : uniforme sur toutes les confirmations, là où
					// un seul appelant posait son propre `aria-label` à la main.
					<form
						action={action}
						onSubmit={onSubmit}
						aria-label={typeof title === "string" ? title : undefined}
					>
						{body}
					</form>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}
