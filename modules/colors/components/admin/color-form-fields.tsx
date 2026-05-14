"use client";

import { CopyButton } from "@/shared/components/copy-button";
import { FieldLabel } from "@/shared/components/forms";
import { Field, FieldError } from "@/shared/components/ui/field";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import { ColorSwatch } from "@/modules/products/components/aria-color-swatch";

import { HexColorInput } from "../hex-color-input";
import { COLOR_LIBRARY } from "../../constants/color-library";
import type { ColorFormInstance } from "../../hooks/use-color-form";
import {
	colorDescriptionSchema,
	colorNameSchema,
	hexColorSchema,
} from "../../schemas/color.schemas";
import { isLightColor } from "../../utils/color-contrast.utils";

const validateHex = (value: string): string | undefined => {
	const result = hexColorSchema.safeParse(value);
	return result.success ? undefined : (result.error.issues[0]?.message ?? "Code couleur invalide");
};

const validateName = (value: string): string | undefined => {
	const result = colorNameSchema.safeParse(value);
	return result.success ? undefined : (result.error.issues[0]?.message ?? "Nom invalide");
};

const validateDescription = (value: string): string | undefined => {
	if (!value || value.length === 0) return undefined;
	const result = colorDescriptionSchema.safeParse(value);
	return result.success ? undefined : (result.error.issues[0]?.message ?? "Description invalide");
};

/**
 * Couleurs courantes utilisées en bijouterie. Permet à la créatrice d'éviter
 * de retenir les codes hex métier les plus fréquents (or, argent, perle).
 */
const SUGGESTED_HEX = [
	{ hex: "#D4AF37", label: "Or jaune" },
	{ hex: "#B76E79", label: "Or rose" },
	{ hex: "#C0C0C0", label: "Argent" },
	{ hex: "#1A1A1A", label: "Noir mat" },
	{ hex: "#F7CAC9", label: "Rose poudré" },
	{ hex: "#FAFAFA", label: "Nacre" },
	{ hex: "#0F52BA", label: "Saphir" },
	{ hex: "#50C878", label: "Émeraude" },
] as const;

interface ColorFormFieldsProps {
	form: ColorFormInstance;
	isPending: boolean;
}

/**
 * Champs partagés entre create-color-form et edit-color-form.
 * - Preview swatch sticky top mobile : visualisation immédiate hex + nom.
 * - Suggestions hex bijouterie : tap pour pré-remplir (haptic light).
 * - Description optionnelle (500 char) : notes métier (or rose 18K, hypoallergénique).
 */
export function ColorFormFields({ form, isPending }: ColorFormFieldsProps) {
	const haptic = useHaptic();

	return (
		<div className="space-y-6">
			<form.Subscribe selector={(state) => ({ hex: state.values.hex, name: state.values.name })}>
				{({ hex, name }) => {
					const isValidHex = hexColorSchema.safeParse(hex).success;
					const swatchBg = isValidHex ? hex : "transparent";
					const displayName = name.trim().length > 0 ? name : "Nouvelle couleur";
					const upperHex = isValidHex ? hex.toUpperCase() : "";
					const isVeryLight = isValidHex && isLightColor(hex, 0.85);
					const isVeryDark = isValidHex && !isLightColor(hex, 0.15);
					// Ring de contraste pour les hex extrêmes (très clairs en mode clair,
					// très foncés en mode sombre) — preview reste visible sur background.
					const needsContrastRing = isVeryLight || isVeryDark;
					const libraryMatch =
						isValidHex && name.trim().length === 0
							? (COLOR_LIBRARY.find((e) => e.hex.toUpperCase() === upperHex) ?? null)
							: null;
					return (
						<>
							<div
								className={cn(
									"bg-background/95 sticky top-(--navbar-height,_56px) z-10 -mx-4 flex items-center gap-4 px-4 py-3 supports-backdrop-blur:backdrop-blur-md sm:static sm:mx-0 sm:rounded-lg sm:border sm:px-4",
								)}
								role="img"
								aria-label={`Aperçu de ${displayName}`}
							>
								<div
									className={cn(
										"border-border size-20 shrink-0 rounded-full border-2 shadow-sm sm:size-24",
										!isValidHex && "border-dashed",
										needsContrastRing && "ring-border/40 ring-1",
									)}
									style={{ backgroundColor: swatchBg }}
									aria-hidden="true"
								/>
								<div className="min-w-0 flex-1">
									<p className="font-display truncate text-lg sm:text-xl">{displayName}</p>
									<div className="flex items-center gap-1">
										<p className="text-muted-foreground font-mono text-xs sm:text-sm">
											{isValidHex ? upperHex : "#______"}
										</p>
										{isValidHex && (
											<CopyButton
												text={upperHex}
												label="Code couleur"
												size="icon"
												className="text-muted-foreground hover:text-foreground size-6"
											/>
										)}
									</div>
									{isValidHex && (
										<div className="mt-2 flex items-center gap-2">
											<span className="text-muted-foreground text-xs">Boutique :</span>
											<ColorSwatch color={swatchBg} colorName={displayName} className="size-6" />
											<ColorSwatch color={swatchBg} colorName={displayName} className="size-7" />
											<ColorSwatch color={swatchBg} colorName={displayName} className="size-8" />
										</div>
									)}
									{isVeryLight && (
										<p className="text-muted-foreground mt-1 text-xs italic">
											Couleur claire — une bordure de contraste sera ajoutée en boutique.
										</p>
									)}
								</div>
							</div>
							<span className="sr-only" aria-live="polite" aria-atomic="true">
								Aperçu : {displayName}
								{isValidHex ? `, ${upperHex}` : ""}
							</span>
							{libraryMatch && (
								<button
									type="button"
									onClick={() => {
										form.setFieldValue("name", libraryMatch.name);
										if (libraryMatch.description) {
											form.setFieldValue("description", libraryMatch.description);
										}
										haptic("light");
									}}
									className="text-primary inline-flex items-center text-xs underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
								>
									Utiliser « {libraryMatch.name} » comme nom
								</button>
							)}
						</>
					);
				}}
			</form.Subscribe>

			<form.AppField name="hex" validators={{ onChange: ({ value }) => validateHex(value) }}>
				{(field) => {
					const errorId = `${field.name}-error`;
					const hasError = field.state.meta.errors.length > 0;
					return (
						<Field data-invalid={hasError}>
							<FieldLabel htmlFor={field.name} required>
								Couleur
							</FieldLabel>
							<HexColorInput
								id={field.name}
								name={field.name}
								value={field.state.value}
								onChange={(hex) => field.handleChange(hex)}
								disabled={isPending}
								aria-invalid={hasError}
								aria-describedby={hasError ? errorId : `${field.name}-help`}
							/>

							<div className="mt-2">
								<p className="text-muted-foreground mb-2 text-xs font-medium">
									Suggestions bijouterie
								</p>
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
									{SUGGESTED_HEX.map((suggestion) => {
										const isSelected =
											field.state.value.toUpperCase() === suggestion.hex.toUpperCase();
										return (
											<button
												key={suggestion.hex}
												type="button"
												disabled={isPending}
												onClick={() => {
													field.handleChange(suggestion.hex);
													haptic("light");
												}}
												aria-label={`Sélectionner ${suggestion.label} (${suggestion.hex})`}
												aria-pressed={isSelected}
												className={cn(
													"focus-visible:ring-ring relative flex h-12 w-full items-center justify-center rounded-md border-2 transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
													isSelected
														? "border-foreground"
														: "border-border hover:border-foreground/60",
												)}
												style={{ backgroundColor: suggestion.hex }}
												title={suggestion.label}
											>
												<span className="sr-only">{suggestion.label}</span>
											</button>
										);
									})}
								</div>
							</div>

							<FieldError id={errorId} errors={field.state.meta.errors} />
						</Field>
					);
				}}
			</form.AppField>

			<form.AppField name="name" validators={{ onChange: ({ value }) => validateName(value) }}>
				{(field) => (
					<field.InputField
						label="Nom"
						type="text"
						placeholder="ex: Or rose 18K, Argent vieilli"
						disabled={isPending}
						required
						autoCapitalize="words"
						enterKeyHint="next"
					/>
				)}
			</form.AppField>

			<form.AppField
				name="description"
				validators={{ onChange: ({ value }) => validateDescription(value) }}
			>
				{(field) => (
					<field.TextareaField
						label="Description"
						optional
						placeholder="Notes : 18 carats, finition mate, hypoallergénique…"
						disabled={isPending}
						rows={3}
						maxLength={500}
						showCounter
					/>
				)}
			</form.AppField>
		</div>
	);
}
