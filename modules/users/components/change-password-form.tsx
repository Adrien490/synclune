"use client";

import { useAppForm } from "@/shared/components/tanstack-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ActionStatus } from "@/shared/types/server-action";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useChangePassword } from "@/modules/auth/hooks/use-change-password";

interface ChangePasswordFormProps {
	onOpenChange?: (open: boolean) => void;
}

export function ChangePasswordForm({ onOpenChange }: ChangePasswordFormProps) {
	const { action, isPending, state } = useChangePassword({ onOpenChange });
	const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);

	// TanStack Form setup
	const form = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	return (
		<form
			action={action}
			className="space-y-6"
			onSubmit={() => form.handleSubmit()}
		>
			{/* Messages */}
			{state?.message && state.status !== ActionStatus.VALIDATION_ERROR && (
				<>
					{state.status === ActionStatus.SUCCESS ? (
						<Alert>
							<CheckCircle2 />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					) : (
						<Alert variant="destructive">
							<AlertCircle />
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}
				</>
			)}

			{/* Champ caché pour revokeOtherSessions */}
			<input
				type="hidden"
				name="revokeOtherSessions"
				value={revokeOtherSessions ? "true" : "false"}
			/>

			<div className="space-y-4">
				{/* Mot de passe actuel */}
				<form.AppField
					name="currentPassword"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value) return "Le mot de passe actuel est requis";
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Mot de passe actuel"
							type="password"
							disabled={isPending || state?.status === ActionStatus.SUCCESS}
							required
						/>
					)}
				</form.AppField>

				{/* Nouveau mot de passe */}
				<form.AppField
					name="newPassword"
					validators={{
						onChangeListenTo: ["currentPassword"],
						onChange: ({ value, fieldApi }) => {
							if (!value) return "Le nouveau mot de passe est requis";
							if (value.length < 8) {
								return "Le mot de passe doit contenir au moins 8 caractères";
							}
							if (value.length > 128) {
								return "Le mot de passe ne doit pas dépasser 128 caractères";
							}
							const currentPassword =
								fieldApi.form.getFieldValue("currentPassword");
							if (currentPassword && value === currentPassword) {
								return "Le nouveau mot de passe doit être différent de l'ancien";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-1.5">
							<field.InputField
								label="Nouveau mot de passe"
								type="password"
								disabled={isPending || state?.status === ActionStatus.SUCCESS}
								required
							/>
							<p className="text-xs text-muted-foreground">
								Minimum 8 caractères, maximum 128 caractères
							</p>
						</div>
					)}
				</form.AppField>

				{/* Confirmation du mot de passe */}
				<form.AppField
					name="confirmPassword"
					validators={{
						onChangeListenTo: ["newPassword"],
						onChange: ({ value, fieldApi }) => {
							if (!value) return "La confirmation du mot de passe est requise";
							if (value.length < 8) {
								return "Le mot de passe doit contenir au moins 8 caractères";
							}
							if (value.length > 128) {
								return "Le mot de passe ne doit pas dépasser 128 caractères";
							}
							if (value !== fieldApi.form.getFieldValue("newPassword")) {
								return "Les mots de passe ne correspondent pas";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Confirmer le mot de passe"
							type="password"
							disabled={isPending || state?.status === ActionStatus.SUCCESS}
							required
						/>
					)}
				</form.AppField>

				{/* Option pour déconnecter les autres sessions */}
				<div className="flex items-start gap-3 pt-2 rounded-lg border p-4 bg-muted/50">
					<Checkbox
						id="revokeOtherSessions"
						checked={revokeOtherSessions}
						onCheckedChange={(checked) =>
							setRevokeOtherSessions(checked === true)
						}
						disabled={isPending || state?.status === ActionStatus.SUCCESS}
					/>
					<div className="space-y-1">
						<label
							htmlFor="revokeOtherSessions"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Déconnecter tous les autres appareils
						</label>
						<p className="text-xs text-muted-foreground">
							Déconnecte toutes tes sessions actives sauf celle-ci
						</p>
					</div>
				</div>
			</div>

			{/* Submit button */}
			<div className="flex justify-end">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button disabled={!canSubmit || isPending} type="submit">
							{isPending ? "Changement en cours..." : "Changer le mot de passe"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
