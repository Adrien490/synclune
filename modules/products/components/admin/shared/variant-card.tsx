"use client";

import { Info } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { FieldLabel } from "@/shared/components/forms";
import { ColorMultiSelectField } from "@/modules/colors/components/admin/color-multi-select-field";
import { MaterialMultiSelectField } from "@/modules/materials/components/admin/material-multi-select-field";

import { MOBILE_SECTION_TITLE } from "./shared-styles";

type ColorOption = { id: string; name: string; hex: string };
type MaterialOption = { id: string; name: string };

export interface VariantCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	colors: ColorOption[];
	materials: MaterialOption[];
	/** Nom du champ TanStack pour les couleurs (e.g. "initialSku.colorIds", "colorIds"). */
	colorIdsFieldName: string;
	/** Nom du champ pour les matériaux. */
	materialsFieldName: string;
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
	colorIdsFieldName,
	materialsFieldName,
	sizeFieldName,
	ariaLabel = "Variante",
	tooltipText,
	viewTransitionName,
}: VariantCardProps) {
	return (
		<Card
			role="region"
			aria-label={ariaLabel}
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<div className="flex items-center gap-1">
					<CardTitle className={MOBILE_SECTION_TITLE}>Variante</CardTitle>
					{tooltipText ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="-m-2 hidden h-8 min-h-11 w-8 min-w-11 hover:bg-transparent sm:inline-flex"
									aria-label="Plus d'informations sur la variante"
								>
									<Info className="text-muted-foreground hover:text-foreground size-4 transition-colors" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="max-w-62.5">
								<p>{tooltipText}</p>
							</TooltipContent>
						</Tooltip>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField name={colorIdsFieldName}>
					{(field: {
						name: string;
						state: { value: string[] };
						handleChange: (v: string[]) => void;
					}) => (
						<ColorMultiSelectField
							fieldName={field.name}
							value={field.state.value}
							onValueChange={(ids) => field.handleChange(ids)}
							options={colors}
						/>
					)}
				</form.AppField>

				<form.AppField name={materialsFieldName}>
					{(field: {
						name: string;
						state: { value: string[] };
						handleChange: (v: string[]) => void;
					}) => (
						<MaterialMultiSelectField
							fieldName={field.name}
							value={field.state.value}
							onValueChange={(ids) => field.handleChange(ids)}
							options={materials}
						/>
					)}
				</form.AppField>

				<form.AppField name={sizeFieldName}>
					{(field: {
						InputGroupField: React.ComponentType<{
							placeholder: string;
							inputMode: "text" | "numeric";
							enterKeyHint: "next" | "done";
							autoCapitalize: "none" | "sentences" | "words";
							autoComplete: string;
						}>;
					}) => (
						<div className="space-y-2">
							<FieldLabel optional>Taille</FieldLabel>
							<field.InputGroupField
								placeholder="Ex: 52, Ajustable, 18cm…"
								inputMode="text"
								enterKeyHint="next"
								autoCapitalize="none"
								autoComplete="off"
							/>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
