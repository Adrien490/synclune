"use client";

import { InfoIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { VariantAttributeFields } from "./variant-attribute-fields";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

type ColorOption = { id: string; name: string; hex: string | null };
type MaterialOption = { id: string; name: string };

export interface VariantCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	colors: ColorOption[];
	materials: MaterialOption[];
	/** Nom du champ TanStack pour la couleur (e.g. "initialVariant.colorId", "colorId"). */
	colorFieldName: string;
	/** Nom du champ pour le matériau. */
	materialFieldName: string;
	/** Nom du champ pour la taille. */
	sizeFieldName: string;
	/** aria-label sur la Card region (default "Variante"). */
	ariaLabel?: string;
	/** Texte du tooltip d'info (sm:inline-flex sur le titre). */
	tooltipText?: string;
	/** viewTransitionName optionnel pour morphing entre formulaires. */
	viewTransitionName?: string;
}

export function VariantCard({
	form,
	colors,
	materials,
	colorFieldName,
	materialFieldName,
	sizeFieldName,
	ariaLabel = "Variante",
	tooltipText,
	viewTransitionName,
}: VariantCardProps) {
	return (
		<Card
			role="region"
			aria-label={ariaLabel}
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<div className="flex items-center gap-1">
					<FormSectionTitle>Variante</FormSectionTitle>
					{tooltipText ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="-m-2 hidden h-8 min-h-11 w-8 min-w-11 hover:bg-transparent sm:inline-flex"
										aria-label="Plus d'informations sur la variante"
									/>
								}
							>
								<InfoIcon className="text-muted-foreground hover:text-foreground size-4 transition-colors" />
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-62.5">
								<p>{tooltipText}</p>
							</TooltipContent>
						</Tooltip>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 md:px-6">
				<VariantAttributeFields
					// `form` est volontairement `any` des deux côtés : trois instances de
					// formulaire distinctes le traversent, et les typer en union ferait
					// exploser les génériques. Décision d'API déjà arbitrée sur les cards
					// admin — ne pas la « corriger ».
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					form={form}
					colors={colors}
					materials={materials}
					colorFieldName={colorFieldName}
					materialFieldName={materialFieldName}
					sizeFieldName={sizeFieldName}
				/>
			</CardContent>
		</Card>
	);
}
