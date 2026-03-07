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

export const bulkSuspendUsersSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun utilisateur selectionne").max(200),
});

// ============================================================================
// RESTORE USER SCHEMAS (Admin)
// ============================================================================

export const restoreUserSchema = z.object({
	id: z.cuid2("ID utilisateur invalide"),
});

export const bulkRestoreUsersSchema = z.object({
	ids: z.array(z.cuid2("ID invalide")).min(1, "Aucun utilisateur selectionne").max(200),
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
// DIRECT PARAM SCHEMAS (Admin)
// ============================================================================

export const adminUserIdSchema = z.object({
	userId: z.cuid2("ID utilisateur invalide"),
});
