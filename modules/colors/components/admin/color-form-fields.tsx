"use client";

import { CopyButton } from "@/shared/components/copy-button";
import { FieldLabel } from "@/shared/components/forms";
import { Field, FieldError } from "@/shared/components/ui/field";
import { Switch } from "@/shared/components/ui/switch";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useRecentColors } from "@/shared/hooks/use-recent-colors";
import { cn } from "@/shared/utils/cn";

import { ColorSwatch } from "@/modules/products/components/aria-color-swatch";

import { HexColorInput } from "../hex-color-input";
import { COLOR_LIBRARY, FEATURED_COLORS } from "../../constants/color-library";
import type { ColorFormInstance } from "../../hooks/use-color-form";
import {
	colorDescriptionSchema,
	colorNameSchema,
	hexColorSchema,
} from "../../schemas/color.schemas";
import { getSwatchContrast, isLightColor, type WcagRating } from "../../utils/color-contrast.utils";

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

const WCAG_LABEL: Record<WcagRating, string> = {
	AAA: "Excellent",
	AA: "Bon",
	"AA-large": "Moyen",
	faible: "Faible",
};

const WCAG_CLASS: Record<WcagRating, string> = {
	AAA: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
	AA: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
	"AA-large": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
	faible: "bg-muted text-muted-foreground",
};

interface ColorFormFieldsProps {
	form: ColorFormInstance;
	isPending: boolean;
	/** Affiche le toggle « Couleur active » (édition uniquement). */
	showStatus?: boolean;
}

/**
 * Champs partagés entre create-color-form et edit-color-form.
 * - Preview swatch sticky top mobile : visualisation immédiate hex + nom + contraste WCAG.
 * - Couleurs récentes (localStorage) + suggestions bijouterie dérivées de la library.
 * - Tap suggestion → pré-remplit hex + nom + description si le nom est vide.
 * - Description optionnelle (500 char) + toggle isActive en édition.
 */
export function ColorFormFields({ form, isPending, showStatus = false }: ColorFormFieldsProps) {
	const haptic = useHaptic();
	const recentColors = useRecentColors();

	// Applique un hex et, si le champ nom est vide, pré-remplit nom + description
	// depuis la library (cohérent avec ColorLibrarySheet, un seul tap).
	const applyColor = (hex: string, name?: string, description?: string | null) => {
		form.setFieldValue("hex", hex);
		if (form.getFieldValue("name").trim().length === 0) {
			const match = COLOR_LIBRARY.find((e) => e.hex.toUpperCase() === hex.toUpperCase());
			const resolvedName = name ?? match?.name;
			if (resolvedName) form.setFieldValue("name", resolvedName);
			const resolvedDesc = description ?? match?.description;
			if (resolvedDesc) form.setFieldValue("description", resolvedDesc);
		}
		haptic("light");
	};

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
					const contrast = isValidHex ? getSwatchContrast(hex) : null;
					const libraryMatch =
						isValidHex && name.trim().length === 0
							? (COLOR_LIBRARY.find((e) => e.hex.toUpperCase() === upperHex) ?? null)
							: null;
					return (
						<>
							<div className="bg-background/95 sticky top-(--navbar-height,_56px) z-10 -mx-4 flex items-center gap-4 px-4 py-3 supports-backdrop-blur:backdrop-blur-md sm:static sm:mx-0 sm:rounded-lg sm:border sm:px-4">
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
										<div className="mt-2 flex flex-wrap items-center gap-2">
											<span className="text-muted-foreground text-xs">Boutique :</span>
											<ColorSwatch color={swatchBg} colorName={displayName} className="size-7" />
											{contrast && (
												<span
													aria-hidden="true"
													className={cn(
														"rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium",
														WCAG_CLASS[contrast.rating],
													)}
													title={`Contraste ${contrast.ratio.toFixed(1)}:1 sur fond clair (WCAG)`}
												>
													{contrast.ratio.toFixed(1)}:1 · {WCAG_LABEL[contrast.rating]}
												</span>
											)}
										</div>
									)}
									{isVeryLight && (
										<p className="text-muted-foreground mt-1 text-xs italic">
											Couleur claire — une bordure de contraste sera ajoutée en boutique.
										</p>
									)}
									{isVeryDark && (
										<p className="text-muted-foreground mt-1 text-xs italic">
											Couleur foncée — restera visible sur les fonds sombres.
										</p>
									)}
								</div>
							</div>
							<span className="sr-only" aria-live="polite" aria-atomic="true">
								Aperçu : {displayName}
								{isValidHex ? `, ${upperHex}` : ""}
								{contrast
									? `, contraste ${contrast.ratio.toFixed(1)} pour 1 sur fond clair (${WCAG_LABEL[contrast.rating]})`
									: ""}
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

							{recentColors.length > 0 && (
								<div className="mt-3">
									<p className="text-muted-foreground mb-2 text-xs font-medium">
										Récemment utilisées
									</p>
									<div className="flex flex-wrap gap-2">
										{recentColors.map((hex) => {
											const isSelected = field.state.value.toUpperCase() === hex.toUpperCase();
											return (
												<button
													key={hex}
													type="button"
													disabled={isPending}
													onClick={() => applyColor(hex)}
													aria-label={`Réutiliser ${hex}`}
													aria-pressed={isSelected}
													className={cn(
														"focus-visible:ring-ring size-9 rounded-md border-2 transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
														isSelected
															? "border-foreground"
															: "border-border hover:border-foreground/60",
													)}
													style={{ backgroundColor: hex }}
													title={hex}
												>
													<span className="sr-only">{hex}</span>
												</button>
											);
										})}
									</div>
								</div>
							)}

							<div className="mt-3">
								<p className="text-muted-foreground mb-2 text-xs font-medium">
									Suggestions bijouterie
								</p>
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
									{FEATURED_COLORS.map((suggestion) => {
										const isSelected =
											field.state.value.toUpperCase() === suggestion.hex.toUpperCase();
										return (
											<button
												key={suggestion.hex}
												type="button"
												disabled={isPending}
												onClick={() =>
													applyColor(suggestion.hex, suggestion.name, suggestion.description)
												}
												aria-label={`Sélectionner ${suggestion.name} (${suggestion.hex})`}
												aria-pressed={isSelected}
												className={cn(
													"focus-visible:ring-ring relative flex h-12 w-full items-center justify-center rounded-md border-2 transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
													isSelected
														? "border-foreground"
														: "border-border hover:border-foreground/60",
												)}
												style={{ backgroundColor: suggestion.hex }}
												title={suggestion.name}
											>
												<span className="sr-only">{suggestion.name}</span>
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
						className="resize-none"
					/>
				)}
			</form.AppField>

			{showStatus && (
				<form.AppField name="isActive">
					{(field) => (
						<Field
							orientation="horizontal"
							className="flex-row items-center justify-between gap-4 rounded-lg border p-4"
						>
							<div className="space-y-0.5">
								<FieldLabel htmlFor={field.name}>Couleur active</FieldLabel>
								<p className="text-muted-foreground text-xs">
									Une couleur inactive reste enregistrée mais n'apparaît plus en boutique.
								</p>
							</div>
							<Switch
								id={field.name}
								checked={field.state.value === true}
								onCheckedChange={(checked) => {
									field.handleChange(checked);
									haptic("selection");
								}}
								disabled={isPending}
								aria-label="Couleur active"
							/>
						</Field>
					)}
				</form.AppField>
			)}
		</div>
	);
}
