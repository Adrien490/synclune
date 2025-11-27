import { z } from "zod";

// ============================================================================
// GET PRODUCT COUNTS BY STATUS SCHEMA
// ============================================================================

/**
 * Schema pour getProductCountsByStatus - pas de paramètres requis
 * Retourne les compteurs par statut (PUBLIC, DRAFT, ARCHIVED)
 */
export const getProductCountsByStatusSchema = z.object({}).optional();
