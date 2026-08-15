"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { Spinner } from "@/shared/components/ui/spinner";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";

import type { CreateProductFormInstance } from "./create-product-form-types";

const STATUS_OPTIONS = [
	{ value: "false", label: "Brouillon" },
	{ value: "true", label: "En vente" },
];

interface CreateProductEtabliBarProps {
	form: CreateProductFormInstance;
	isPending: boolean;
	isMediaUploading: boolean;
}

/**
 * La règle d'établi : ce qui DÉCIDE de la mise en vente, sous les yeux en permanence.
 *
 * Le formulaire est coupé en deux gestes. La colonne porte ce qui se *rédige* — les
 * photos, le bijou, son prix et son stock — à une mesure de lecture bornée. Cette
 * barre porte ce qui se *décide* : la visibilité, l'état de la pièce, et le bouton
 * qui l'envoie en boutique. Elle est collante aux deux bouts de l'échelle (cf. le
 * `className` passé à `AdminFormFooter` par le formulaire).
 *
 * ## L'aplat rose est une SURFACE, et rien ne se pose dessus
 *
 * La barre passe du gris à l'aplat `--primary` quand la pièce est complète : un état,
 * pas un ornement — elle répond à « est-ce que je peux publier ? » sans faire remonter
 * l'œil. `--primary` sous `--foreground` mesure 12,61:1, donc le texte y est
 * confortable.
 *
 * ⚠️ Les CONTRÔLES, eux, ne doivent jamais être posés sur cet aplat. `RadioGroupItem`
 * rend son point sélectionné en `text-primary` et sa bordure en `border-input` : sur
 * `bg-primary` le point tombait à **1:1** (jeton identique) et la bordure à 1,33:1 —
 * l'état de visibilité devenait illisible précisément au moment de publier. D'où la
 * puce `bg-card` ci-dessous, qui rend au radio le fond blanc qu'il a partout ailleurs
 * plutôt que de surcharger les couleurs d'un composant partagé par tout le dépôt.
 *
 * ## Pourquoi le bouton n'est pas désactivé quand il manque quelque chose
 *
 * Les validateurs TanStack ne tournent qu'au `onChange` : au montage le formulaire
 * est « valide » alors qu'il est vide. Un bouton désactivé sur cette base serait à la
 * fois faux et un cul-de-sac clavier. Le libellé dit donc ce qui manque, le bouton
 * reste actionnable, et la soumission déclenche la validation puis le focus sur le
 * premier champ fautif (`useFocusFirstError`).
 *
 * ⚠️ Ce rationnel ne tenait QUE pour le premier clic tant que la barre utilisait
 * `form.SubmitButton`, qui force `disabled={!canSubmit}` : `canSubmit` bascule à
 * `false` dès le premier envoi raté, et le bouton — donc le seul endroit qui dit ce
 * qui manque — sortait de l'ordre de tabulation. D'où la dérogation documentée sur
 * le `<Button>` ci-dessous. Il ne se grise que sur une occupation réelle.
 *
 * ⚠️ Le récapitulatif ne répète PAS ce message et ne porte PAS d'`aria-live` : il se
 * recomposait à chaque frappe du titre et du prix, ce qui faisait ânonner le lecteur
 * d'écran pendant toute la saisie. L'information vit sur le bouton, lu au focus.
 */
export function CreateProductEtabliBar({
	form,
	isPending,
	isMediaUploading,
}: CreateProductEtabliBarProps) {
	const haptic = useHaptic();

	return (
		<form.Subscribe
			selector={(state) =>
				[
					state.values.active,
					state.values.name,
					state.values.priceEuros,
					Number(state.values.initialVariant.stock),
					state.values.media.length,
				] as const
			}
		>
			{([active, name, price, stock, mediaCount]) => {
				// ⚠️ La mise en vente à zéro stock fait partie de « ce qui manque ».
				// Sans cette branche, la barre s'allumait et proposait « Publier le
				// bijou » pendant que l'alerte « Publication incohérente » annonçait que
				// le serveur refuserait — l'interface se contredisait à elle-même.
				// (L'alerte vit désormais dans la section « Le prix et le stock », qu'elle
				// décrit ; ce test-ci reste le SIEN, sinon la barre s'allumerait quand
				// même.)
				const isBusy = isPending || isMediaUploading;
				const publishesEmptyStock = active === "true" && stock <= 0;
				const missing =
					mediaCount === 0
						? "Ajoute une photo"
						: !name || name.trim().length < 2
							? "Il manque le titre"
							: !price || price <= 0
								? "Il manque le prix"
								: publishesEmptyStock
									? "Renseigne le stock"
									: null;
				const isReady = missing === null;

				return (
					<div
						data-slot="etabli-bar"
						// Attribut booléen à la Base UI (présent/absent), pas un `data-state` :
						// c'est le point d'accroche stable des tests, qui n'ont ainsi pas à
						// s'arrimer à des classes Tailwind.
						data-ready={isReady || undefined}
						className={cn(
							"flex flex-col gap-3 rounded-xl border px-4 py-3",
							"md:flex-row md:items-center md:gap-6",
							"motion-safe:transition-colors motion-safe:duration-200",
							isReady ? "border-primary bg-primary" : "border-border bg-muted/40",
						)}
					>
						{/*
						 * `md:contents` : sur téléphone ce conteneur groupe la visibilité et
						 * le récapitulatif sur UNE rangée (la barre passe de trois rangées à
						 * deux, ~188px → ~130px, sur un écran déjà amputé de la bottom bar) ;
						 * à partir de md il s'efface et ses deux enfants redeviennent des
						 * items directs du flex de la barre.
						 */}
						<div className="flex flex-wrap items-center justify-between gap-3 md:contents">
							<form.AppField name="active" listeners={{ onChange: () => haptic("selection") }}>
								{(field: {
									name: string;
									RadioGroupField: React.ComponentType<{
										label: string;
										"aria-label": string;
										options: typeof STATUS_OPTIONS;
										disabled?: boolean;
									}>;
								}) => (
									<div className="bg-card flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-1.5">
										{/*
										 * Pas de `required` : `RequiredFieldsNote` promet que l'astérisque
										 * marque ce qui reste à remplir, or la visibilité a TOUJOURS une
										 * valeur (« En vente » par défaut). L'astérisque y désignait un
										 * champ qu'on ne peut pas laisser vide — donc du bruit.
										 */}
										<FieldLabel htmlFor={field.name}>Visibilité</FieldLabel>
										{/*
										 * `aria-label` explicite : `RadioGroupField` ne pose aucun `id`
										 * sur son `RadioGroup`, donc le `htmlFor` du libellé visible ne
										 * l'atteint pas et le groupe restait sans nom accessible.
										 * `disabled` : la barre vit HORS du <fieldset disabled> de la
										 * colonne — sans ça la visibilité restait active pendant l'envoi.
										 */}
										<field.RadioGroupField
											label=""
											aria-label="Visibilité"
											options={STATUS_OPTIONS}
											disabled={isPending}
										/>
									</div>
								)}
							</form.AppField>

							<p className="text-foreground text-sm md:ml-auto">
								<span className="font-semibold">
									{price && price > 0 ? formatEuro(Math.round(price * 100)) : "Prix à définir"}
								</span>
								<span aria-hidden="true"> · </span>
								{stock > 0 ? `${stock} en stock` : "aucun stock"}
							</p>
						</div>

						{/*
						 * ⚠️ Dérogation ASSUMÉE à `form.SubmitButton` — NE PAS harmoniser, sur
						 * le modèle de `create-refund-form`.
						 *
						 * Le bouton partagé force `disabled={!canSubmit || isPending}`. Or
						 * `canSubmit` passe à `false` dès le PREMIER envoi raté (vérifié dans
						 * `form-core` : `(submissionAttempts === 0 && !isTouched) || (… && isValid)`).
						 * Le bouton sortait donc de l'ordre de tabulation — et avec lui le SEUL
						 * endroit qui dit ce qui manque, puisque c'est son libellé qui le porte.
						 * Exactement le « cul-de-sac clavier » que le bloc ci-dessus dit vouloir
						 * éviter : le rationnel ne tenait que pour le premier clic.
						 *
						 * Le bouton ne se grise donc que sur une occupation RÉELLE (action
						 * serveur en vol, téléversement en cours). Un formulaire incomplet
						 * reste soumettable : la soumission déclenche la validation, puis
						 * `useFocusFirstError` emmène au premier champ fautif.
						 *
						 * Contrepartie de la dérogation : tout ce que `SubmitButton` apportait
						 * est reproduit ici — `aria-busy`, spinner, haptique et hint ⌘S.
						 */}
						<Button
							type="submit"
							disabled={isBusy}
							aria-busy={isBusy}
							onClick={() => haptic("medium")}
							// Encre sombre dans les deux états : sur l'aplat rose comme sur le gris,
							// `--foreground` reste très au-dessus du seuil, là où le rose primaire
							// disparaîtrait sur lui-même une fois la barre allumée.
							className="bg-foreground text-background hover:bg-foreground/90 w-full sm:min-w-56 md:w-auto"
						>
							{isBusy && <Spinner presentational />}
							<span>
								{isBusy
									? isPending
										? active === "true"
											? "Publication…"
											: "Enregistrement…"
										: "Téléversement…"
									: (missing ??
										(active === "true" ? "Publier le bijou" : "Enregistrer le brouillon"))}
							</span>
							{!isBusy && (
								<Kbd
									aria-hidden="true"
									className="bg-primary-foreground/10 text-primary-foreground ml-1 hidden lg:inline-flex"
								>
									⌘S
								</Kbd>
							)}
						</Button>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
