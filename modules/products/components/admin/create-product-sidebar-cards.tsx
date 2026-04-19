"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Euro, Info, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
	CreateProductFormInstance,
	CreateProductFormProps,
} from "./create-product-form-types";

interface CreateProductSidebarCardsProps {
	form: CreateProductFormInstance;
	colors: CreateProductFormProps["colors"];
	materials: CreateProductFormProps["materials"];
}

export function CreateProductSidebarCards({
	form,
	colors,
	materials,
}: CreateProductSidebarCardsProps) {
	return (
		<div className="space-y-6">
			<VariantCard form={form} colors={colors} materials={materials} />
			<PricingCard form={form} />
			<StockCard form={form} />
			<StatusCard form={form} />
		</div>
	);
}

const MOBILE_SECTION_TITLE =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";

// Variant card with color, material, and size fields
function VariantCard({
	form,
	colors,
	materials,
}: {
	form: CreateProductFormInstance;
	colors: CreateProductFormProps["colors"];
	materials: CreateProductFormProps["materials"];
}) {
	const router = useRouter();
	const haptic = useHaptic();
	const colorDialog = useDialog(COLOR_DIALOG_ID);
	const materialDialog = useDialog(MATERIAL_DIALOG_ID);

	return (
		<Card
			role="region"
			aria-label="Variante initiale"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<div className="flex items-center gap-1">
					<CardTitle className={MOBILE_SECTION_TITLE}>Variante</CardTitle>
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
								Ces attributs concernent la première variante du produit. Vous pourrez ajouter
								d'autres variantes après la création.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField
					name="initialSku.colorId"
					listeners={{ onChange: () => haptic("selection") }}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Couleur
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<field.SelectField
										label=""
										options={colors.map((c) => ({
											value: c.id,
											label: c.name,
										}))}
										renderOption={(opt) => {
											const c = colors.find((x) => x.id === opt.value);
											return (
												<div className="flex items-center gap-2">
													{c && (
														<div
															className="border-border h-4 w-4 rounded-full border"
															style={{
																backgroundColor: c.hex,
															}}
															aria-hidden="true"
														/>
													)}
													<span>{opt.label}</span>
												</div>
											);
										}}
										renderValue={(val) => {
											const c = colors.find((x) => x.id === val);
											return c ? (
												<div className="flex items-center gap-2">
													<div
														className="border-border h-4 w-4 rounded-full border"
														style={{
															backgroundColor: c.hex,
														}}
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

				<form.AppField
					name="initialSku.materialId"
					listeners={{ onChange: () => haptic("selection") }}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Matériau
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<field.SelectField
										label=""
										options={materials.map((m) => ({
											value: m.id,
											label: m.name,
										}))}
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

				<form.AppField name="initialSku.size">
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

const COMPARE_AT_PRICE_ERROR = "Le prix comparé doit être supérieur ou égal au prix de vente";

type CompareAtValidatorArgs = {
	value: number | undefined;
	fieldApi: {
		form: { getFieldValue: (name: "initialSku.priceInclTaxEuros") => number | null | undefined };
	};
};

function validateCompareAtPrice({ value, fieldApi }: CompareAtValidatorArgs) {
	if (!value) return undefined;
	const price = fieldApi.form.getFieldValue("initialSku.priceInclTaxEuros");
	return price && value < price ? COMPARE_AT_PRICE_ERROR : undefined;
}

// Pricing card with price and compare-at-price fields
function PricingCard({ form }: { form: CreateProductFormInstance }) {
	return (
		<Card
			role="region"
			aria-label="Tarification"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Tarification</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField name="initialSku.priceInclTaxEuros">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel required>Prix de vente final</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								required
								enterKeyHint="next"
								aria-describedby="price-sale-hint"
							>
								<InputGroupAddon>
									<Euro className="h-4 w-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="price-sale-hint" className="text-muted-foreground text-xs">
								Le prix que paiera le client
							</p>
						</div>
					)}
				</form.AppField>

				<form.AppField
					name="initialSku.compareAtPriceEuros"
					validators={{
						onChangeListenTo: ["initialSku.priceInclTaxEuros"],
						onChange: validateCompareAtPrice,
						onBlur: validateCompareAtPrice,
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Ancien prix (affiché barré)</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								enterKeyHint="done"
								aria-describedby="price-compare-hint"
							>
								<InputGroupAddon>
									<Euro className="h-4 w-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="price-compare-hint" className="text-muted-foreground text-xs">
								Sera affiché barré à côté du prix actuel (ex:{" "}
								<span className="line-through">45€</span> → 39€)
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}

// Status card with DRAFT / PUBLIC radio (visible to prevent mis-tap at submit time)
function StatusCard({ form }: { form: CreateProductFormInstance }) {
	const haptic = useHaptic();

	return (
		<Card
			role="region"
			aria-label="Statut du bijou"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Statut</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				<form.AppField name="status" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} required>
								Visibilité
							</FieldLabel>
							<field.RadioGroupField
								label=""
								options={[
									{ value: "DRAFT", label: "Brouillon" },
									{ value: "PUBLIC", label: "Public" },
								]}
							/>
							<p className="text-muted-foreground text-xs">
								Un brouillon reste invisible côté boutique. Public le rend visible immédiatement.
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}

// Stock card with inventory field
function StockCard({ form }: { form: CreateProductFormInstance }) {
	return (
		<Card
			role="region"
			aria-label="Stock"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Stock</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				<form.AppField name="initialSku.inventory">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Quantité en stock</FieldLabel>
							<field.InputGroupField
								type="number"
								min={0}
								inputMode="numeric"
								enterKeyHint="done"
								aria-describedby="stock-hint"
							>
								<InputGroupAddon align="inline-end">
									<Package className="text-muted-foreground h-4 w-4" />
									<InputGroupText className="text-muted-foreground text-xs">unités</InputGroupText>
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="stock-hint" className="text-muted-foreground text-xs">
								Laissez vide ou 0 si le bijou est en rupture
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
