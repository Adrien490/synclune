"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Info, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SkuFormInstance, SkuFormSharedProps } from "./sku-form-types";

interface SkuInfoCardProps {
	form: SkuFormInstance;
	colors: SkuFormSharedProps["colors"];
	materials: SkuFormSharedProps["materials"];
}

const MOBILE_SECTION_TITLE =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";

export function SkuInfoCard({ form, colors, materials }: SkuInfoCardProps) {
	return (
		<div className="space-y-6">
			<AttributesCard form={form} colors={colors} materials={materials} />
			<StatusCard form={form} />
		</div>
	);
}

function AttributesCard({
	form,
	colors,
	materials,
}: {
	form: SkuFormInstance;
	colors: SkuFormSharedProps["colors"];
	materials: SkuFormSharedProps["materials"];
}) {
	const router = useRouter();
	const haptic = useHaptic();
	const colorDialog = useDialog(COLOR_DIALOG_ID);
	const materialDialog = useDialog(MATERIAL_DIALOG_ID);

	return (
		<Card
			role="region"
			aria-label="Attributs de la variante"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "sku-attributes" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<div className="flex items-center gap-1">
					<CardTitle className={MOBILE_SECTION_TITLE}>Attributs</CardTitle>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="-m-2 hidden h-8 min-h-11 w-8 min-w-11 hover:bg-transparent sm:inline-flex"
								aria-label="Plus d'informations sur les attributs de la variante"
							>
								<Info className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="max-w-62.5">
							<p>
								Couleur, matériau et taille distinguent cette variante des autres SKU du même
								produit.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField name="colorId" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Couleur
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<field.SelectField
										label=""
										options={colors.map((c) => ({ value: c.id, label: c.name }))}
										renderOption={(opt) => {
											const c = colors.find((x) => x.id === opt.value);
											return (
												<div className="flex items-center gap-2">
													{c && (
														<div
															className="border-border h-4 w-4 rounded-full border"
															style={{ backgroundColor: c.hex }}
															aria-hidden="true"
														/>
													)}
													<span>{opt.label}</span>
												</div>
											);
										}}
										renderValue={(val: string | undefined) => {
											const c = colors.find((x) => x.id === val);
											return c ? (
												<div className="flex items-center gap-2">
													<div
														className="border-border h-4 w-4 rounded-full border"
														style={{ backgroundColor: c.hex }}
														aria-hidden="true"
													/>
													<span>{c.name}</span>
												</div>
											) : (
												<span className="text-muted-foreground">Sélectionner une couleur</span>
											);
										}}
										placeholder="Sélectionner une couleur"
										clearable
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => {
										haptic("light");
										colorDialog.open({
											onCreated: (id: string) => {
												field.handleChange(id);
												router.refresh();
											},
										});
									}}
									aria-label="Créer une nouvelle couleur"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</form.AppField>

				<form.AppField name="materialId" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Matériau
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<field.SelectField
										label=""
										options={materials.map((m) => ({ value: m.id, label: m.name }))}
										placeholder="Sélectionner un matériau"
										clearable
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => {
										haptic("light");
										materialDialog.open({
											onCreated: (id: string) => {
												field.handleChange(id);
												router.refresh();
											},
										});
									}}
									aria-label="Créer un nouveau matériau"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</form.AppField>

				<form.AppField name="size">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Taille</FieldLabel>
							<field.InputGroupField
								placeholder="Ex: 52, Ajustable, 18cm..."
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

function StatusCard({ form }: { form: SkuFormInstance }) {
	const haptic = useHaptic();

	return (
		<Card
			role="region"
			aria-label="Statut de la variante"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Statut</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField name="isActive" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} required>
								Disponibilité
							</FieldLabel>
							<field.RadioGroupField
								label=""
								options={[
									{ value: "true", label: "Actif" },
									{ value: "false", label: "Inactif" },
								]}
							/>
							<p className="text-muted-foreground text-xs">
								Une variante inactive n'est pas achetable même si le produit est public
							</p>
						</div>
					)}
				</form.AppField>

				<form.AppField name="isDefault" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Variante par défaut</FieldLabel>
							<field.CheckboxField label="Affichée en premier sur la fiche produit" />
							<p className="text-muted-foreground text-xs">
								Une seule variante par produit peut être marquée par défaut
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
