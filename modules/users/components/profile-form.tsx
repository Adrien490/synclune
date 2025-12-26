"use client";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useUpdateProfile } from "@/modules/users/hooks/use-update-profile";
import { GetCurrentUserReturn } from "@/modules/users/data/get-current-user";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
	user: GetCurrentUserReturn;
}

export function ProfileForm({ user }: ProfileFormProps) {
	const router = useRouter();
	const { state, action, isPending } = useUpdateProfile({
		onSuccess: () => {
			router.refresh();
		},
	});

	const form = useAppForm({
		defaultValues: {
			name: user?.name || "",
		},
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	return (
		<form
			action={action}
			onSubmit={() => form.handleSubmit()}
			className="space-y-4"
		>
			<form.AppField
				name="name"
				validators={{
					onChange: ({ value }) => {
						if (!value || value.length < 2) {
							return "Le prénom doit contenir au moins 2 caractères";
						}
						if (value.length > 100) {
							return "Le prénom ne peut pas dépasser 100 caractères";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<field.InputField
							label="Prénom"
							disabled={isPending}
							required
							autoComplete="given-name"
							autoCapitalize="words"
							autoCorrect="off"
						/>
						<p className="text-sm text-muted-foreground">
							Ce prénom sera utilisé pour vos commandes et communications
						</p>
					</div>
				)}
			</form.AppField>

			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					type="email"
					value={user?.email || ""}
					disabled
					className="bg-muted cursor-not-allowed"
				/>
				<p className="text-sm text-muted-foreground">
					L&apos;adresse email ne peut pas être modifiée
				</p>
			</div>

			<form.Subscribe selector={(s) => [s.canSubmit]}>
				{([canSubmit]) => (
					<Button type="submit" disabled={!canSubmit || isPending}>
						{isPending ? "Enregistrement..." : "Enregistrer les modifications"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
