import { z } from "zod";
import { Role } from "@/app/generated/prisma/client";

// ============================================================================
// DELETE USER SCHEMAS (Admin)
// ============================================================================

export const deleteUserSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
});

export const bulkDeleteUsersSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun utilisateur selectionne").max(200),
});

// ============================================================================
// SUSPEND USER SCHEMAS (Admin)
// ============================================================================

export const suspendUserSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
});

// ============================================================================
// RESTORE USER SCHEMAS (Admin)
// ============================================================================

export const restoreUserSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
});

// ============================================================================
// CHANGE ROLE SCHEMAS (Admin)
// ============================================================================

export const changeUserRoleSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
	role: z.enum([Role.USER, Role.ADMIN]),
});

export const bulkChangeUserRoleSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun utilisateur selectionne").max(200),
	role: z.enum([Role.USER, Role.ADMIN]),
});

// ============================================================================
// TOGGLE EMAIL VERIFIED SCHEMA (Admin)
// ============================================================================

export const toggleEmailVerifiedSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
});

// ============================================================================
// ANONYMIZE NOW SCHEMA (Admin GDPR Art. 17 - immediate)
// ============================================================================

export const anonymizeUserImmediatelySchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
	confirmation: z.string().min(1, "Confirmation requise").max(500, "Confirmation trop longue"),
	reason: z
		.string()
		.trim()
		.min(10, "Raison d'anonymisation requise (minimum 10 caracteres)")
		.max(500, "Raison trop longue"),
});

// ============================================================================
// UNLINK OAUTH ACCOUNT SCHEMA (User self-service)
// ============================================================================

export const unlinkOAuthAccountSchema = z.object({
	providerId: z.string().trim().min(1, "Fournisseur requis").max(50, "Fournisseur invalide"),
});

// ============================================================================
// DIRECT PARAM SCHEMAS (Admin)
// ============================================================================

export const adminUserIdSchema = z.object({
	userId: z.cuid2("ID utilisateur invalide"),
});
