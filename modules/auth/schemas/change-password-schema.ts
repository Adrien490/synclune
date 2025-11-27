import { z } from "zod";

export const changePasswordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1, "Le mot de passe actuel est requis"),
		newPassword: z
			.string()
			.min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le nouveau mot de passe ne doit pas dépasser 128 caractères"),
		confirmPassword: z
			.string()
			.min(8, "Le mot de passe doit contenir au moins 8 caractères")
			.max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: "Le nouveau mot de passe doit être différent de l'ancien",
		path: ["newPassword"],
	});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
