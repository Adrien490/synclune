"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerFormat,
	ColorPickerHue,
	ColorPickerOutput,
	ColorPickerSelection,
} from "@/shared/components/ui/color-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { useCreateColorForm } from "@/modules/colors/hooks/admin/use-create-color";
import { useUpdateColorForm } from "@/modules/colors/hooks/admin/use-update-color-form";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import Color from "color";

export const COLOR_DIALOG_ID = "color-form";

interface ColorDialogData extends Record<string, unknown> {
	color?: {
		id: string;
		name: string;
		slug: string;
		hex: string;
	};
}

export function ColorFormDialog() {
	const { isOpen, close, data } = useDialog<ColorDialogData>(COLOR_DIALOG_ID);
	const color = data?.color;

	// Use appropriate form hook based on mode
	const createFormHook = useCreateColorForm({
		onSuccess: () => {
			close();
		},
	});

	const updateFormHook = useUpdateColorForm({
		color: color || { id: "", name: "", slug: "", hex: "#000000" },
		onSuccess: () => {
			close();
			form.reset();
		},
	});

	// Render create form
	if (!color) {
		const { form, action, isPending } = createFormHook;
		return (
			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open && !isPending) {
						close();
					}
				}}
			>
				<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Créer une couleur</DialogTitle>
						<DialogDescription>
							Ajoutez une nouvelle couleur pour vos produits. Choisissez le code couleur et un nom descriptif.
						</DialogDescription>
					</DialogHeader>

					<form
						action={action}
						className="space-y-6"
						onSubmit={() => form.handleSubmit()}
					>
						<RequiredFieldsNote />

						<div className="space-y-4">
							{/* Color Picker */}
							<form.AppField
								name="hex"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 1) {
											return "Le code couleur est requis";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<label className="text-sm font-medium">
											Couleur
											<span className="text-destructive ml-1">*</span>
										</label>
										<ColorPicker
											value={field.state.value}
											onChange={(rgba) => {
												const colorObj = Color.rgb(rgba);
												const hex = colorObj.hex();
												field.handleChange(hex);
											}}
											className="w-full"
										>
											<div className="space-y-4">
												<div className="h-48 w-full">
													<ColorPickerSelection className="h-full w-full" />
												</div>
												<ColorPickerHue className="w-full" />
												<ColorPickerAlpha className="w-full" />
												<div className="flex gap-2">
													<ColorPickerFormat className="flex-1" />
													<ColorPickerOutput />
												</div>
											</div>
										</ColorPicker>
										<input type="hidden" name="hex" value={field.state.value} />
									</div>
								)}
							</form.AppField>

							{/* Name Field */}
							<form.AppField
								name="name"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 1) {
											return "Le nom est requis";
										}
										if (value.length > 50) {
											return "Le nom ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Nom"
										type="text"
										placeholder="ex: Rouge, Bleu Marine"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>
						</div>

						{/* Submit button */}
						<div className="flex justify-end pt-4">
							<form.Subscribe selector={(state) => [state.canSubmit]}>
								{([canSubmit]) => (
									<Button disabled={!canSubmit || isPending} type="submit">
										{isPending ? "Enregistrement..." : "Créer"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	}

	// Render update form
	const { form, action, isPending } = updateFormHook;
	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Modifier la couleur</DialogTitle>
					<DialogDescription>
						Modifiez les informations de la couleur. Les changements seront appliqués à tous les produits utilisant cette couleur.
					</DialogDescription>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					<input type="hidden" name="id" value={color.id} />

					<RequiredFieldsNote />

					<div className="space-y-4">
						{/* Color Picker */}
						<form.AppField
							name="hex"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 1) {
										return "Le code couleur est requis";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<label className="text-sm font-medium">
										Couleur
										<span className="text-destructive ml-1">*</span>
									</label>
									<ColorPicker
										value={field.state.value}
										onChange={(rgba) => {
											const colorObj = Color.rgb(rgba);
											const hex = colorObj.hex();
											field.handleChange(hex);
										}}
										className="w-full"
									>
										<div className="space-y-4">
											<div className="h-48 w-full">
												<ColorPickerSelection className="h-full w-full" />
											</div>
											<ColorPickerHue className="w-full" />
											<ColorPickerAlpha className="w-full" />
											<div className="flex gap-2">
												<ColorPickerFormat className="flex-1" />
												<ColorPickerOutput />
											</div>
										</div>
									</ColorPicker>
									<input type="hidden" name="hex" value={field.state.value} />
								</div>
							)}
						</form.AppField>

						{/* Name Field */}
						<form.AppField
							name="name"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 1) {
										return "Le nom est requis";
									}
									if (value.length > 50) {
										return "Le nom ne peut pas dépasser 50 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.InputField
									label="Nom"
									type="text"
									placeholder="ex: Rouge, Bleu Marine"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending ? "Enregistrement..." : "Enregistrer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
