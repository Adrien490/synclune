"use client";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useState } from "react";

const ALT_TEXT_MAX_LENGTH = 250;

interface EditAltTextDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentAltText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
	index: number;
	onSave: (altText: string) => void;
}

export function EditAltTextDialog({
	open,
	onOpenChange,
	currentAltText,
	mediaType,
	index,
	onSave,
}: EditAltTextDialogProps) {
	const isVideo = mediaType === "VIDEO";

	return (
		<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
			<ResponsiveDialogContent className="max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						Description de {isVideo ? "la vidéo" : "l'image"} {index + 1}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Décrivez le contenu pour les lecteurs d'écran et le SEO. Concis, factuel, sans préfixe «
						Image de ».
						<span className="mt-2 block text-xs">
							<span className="text-emerald-700">À privilégier</span> : « Bague argent ciselé,
							pierre verte sertie, vue 3/4 ». <span className="text-destructive">À éviter</span> : «
							Image de bague ».
						</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				{/* Inner body is mounted only when open → useState seeds from current value without effect-driven sync */}
				{open && (
					<EditAltTextForm
						initialValue={currentAltText ?? ""}
						isVideo={isVideo}
						onCancel={() => onOpenChange(false)}
						onSave={(next) => {
							onSave(next);
							onOpenChange(false);
						}}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

interface EditAltTextFormProps {
	initialValue: string;
	isVideo: boolean;
	onCancel: () => void;
	onSave: (next: string) => void;
}

function EditAltTextForm({ initialValue, isVideo, onCancel, onSave }: EditAltTextFormProps) {
	const haptic = useHaptic();
	const [value, setValue] = useState(initialValue);

	const overLimit = value.length > ALT_TEXT_MAX_LENGTH;
	const remaining = ALT_TEXT_MAX_LENGTH - value.length;

	const handleSubmit = () => {
		if (overLimit) return;
		haptic("success");
		onSave(value.trim());
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			className="flex flex-col gap-3"
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor="alt-text-input" className="sr-only">
					Description du média
				</Label>
				<Textarea
					id="alt-text-input"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder={
						isVideo
							? "Ex. Bracelet en or rose porté au poignet, vue de face."
							: "Ex. Bague en argent ciselé, sertie d'une pierre verte, vue trois quarts."
					}
					maxLength={ALT_TEXT_MAX_LENGTH + 50}
					aria-invalid={overLimit}
					aria-describedby="alt-text-counter"
					className="min-h-32 resize-none"
				/>
				<p
					id="alt-text-counter"
					className={
						overLimit ? "text-destructive text-xs font-medium" : "text-muted-foreground text-xs"
					}
					aria-live="polite"
				>
					{overLimit
						? `${Math.abs(remaining)} caractère(s) en trop`
						: `${value.length} / ${ALT_TEXT_MAX_LENGTH} caractères`}
				</p>
			</div>

			<ResponsiveDialogFooter>
				<Button
					type="button"
					variant="ghost"
					onClick={() => {
						haptic("light");
						onCancel();
					}}
				>
					Annuler
				</Button>
				<Button
					type="submit"
					disabled={overLimit}
					className="active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]"
				>
					Enregistrer
				</Button>
			</ResponsiveDialogFooter>
		</form>
	);
}
