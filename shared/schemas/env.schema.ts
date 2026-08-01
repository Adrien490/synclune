import { z } from "zod";

import {
	apeCodeSchema,
	bicSchema,
	ibanSchema,
	sirenSchema,
	siretSchema,
	vatNumberSchema,
} from "@/shared/schemas/b2b-identifiers.schema";

/**
 * Variable d'env fiscale : normalisée puis soumise au schéma canonique partagé avec
 * `invoice.schema.ts`.
 *
 * Le message d'erreur reste celui de la variable — au boot, « SIREN doit contenir
 * exactement 9 chiffres » ne dit pas laquelle des ~50 variables est en cause.
 *
 * ⚠️ Le but ici est de **dédupliquer les regex, à acceptation constante**. La
 * normalisation par défaut est donc l'identité, et chaque variable ne reçoit que le
 * traitement que son ancienne regex autorisait déjà :
 *
 *  - SIREN / SIRET acceptaient les espaces (`^\d{3}\s?\d{3}\s?\d{3}$`) → on les
 *    retire avant de valider ;
 *  - TVA, APE, IBAN, BIC ne les acceptaient pas → aucune normalisation.
 *
 * En particulier, **pas de `.toUpperCase()`** : `normalizeFiscalIdentifier` en fait
 * un, mais l'appliquer ici rendrait `fr35839183027` et `47.91b` valides alors que les
 * anciennes regex les rejetaient, sensibles à la casse. Ces variables finissent sur
 * des factures archivées 10 ans (Art. L102 B LPF) : élargir ce qui est accepté n'est
 * pas un effet de bord acceptable d'un refactor de déduplication.
 */
const canonicalFiscal = (
	schema: z.ZodType<string>,
	message: string,
	normalize: (value: string) => string = (value) => value,
) =>
	z
		.string()
		.transform(normalize)
		.refine((value) => schema.safeParse(value).success, message)
		.optional();

/** Retire les espaces de groupage INSEE, sans toucher à la casse ni aux points. */
const stripSpaces = (value: string) => value.replaceAll(/\s/g, "");

/**
 * Schéma de validation des variables d'environnement
 *
 * Les variables sont groupées par domaine fonctionnel.
 */
export const envSchema = z.object({
	// ========================================
	// Base de données
	// ========================================
	DATABASE_URL: z.url("DATABASE_URL doit être une URL valide"),
	// Direct (unpooled) Neon endpoint utilisé exclusivement par `prisma migrate
	// deploy` — PgBouncer (pooler) rejette les prepared statements DDL.
	DATABASE_URL_UNPOOLED: z.url().optional(),
	// Base JETABLE et VIDE que `prisma migrate dev` rejoue avant de differ (shadow
	// database). Sans elle, `migrate dev` échoue en P3006 sur un endpoint Neon poolé —
	// cause racine documentée de l'historique de migrations non rejouable (audit
	// 2026-07-26). Prisma DROP et recrée son schéma à chaque run : ne JAMAIS y pointer
	// une base contenant des données. Optionnel (le workflow `migrate deploy` n'en a
	// pas besoin).
	SHADOW_DATABASE_URL: z.url().optional(),

	// ========================================
	// Authentification (Better Auth)
	// ========================================
	BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit avoir au moins 32 caractères"),
	BETTER_AUTH_URL: z.url(),

	// Google OAuth (optionnel)

	// ========================================
	// Email (Resend)
	// ========================================
	RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY doit commencer par 're_'"),
	RESEND_CONTACT_EMAIL: z.email("RESEND_CONTACT_EMAIL doit être un email valide"),
	// Adresse BCC ajoutée automatiquement aux alertes admin (refund failed,
	// invoice sequence overflow, dispute, etc.). Permet d'éviter un single
	// point of failure sur l'unique boîte admin. Optionnel.
	EMAIL_ADMIN_BCC: z.email("EMAIL_ADMIN_BCC doit être un email valide").optional(),

	// ========================================
	// Stripe (Paiement)
	// ========================================
	STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
	STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),

	// ========================================
	// Upload (UploadThing)
	// ========================================
	UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN est requis"),

	// ========================================
	// Cron Jobs
	// ========================================
	CRON_SECRET: z.string().min(32, "CRON_SECRET doit avoir au moins 32 caractères"),
	/**
	 * Active le dry-run cron (OPS-AUDIT-006) — chaque cron logue ce qu'il
	 * aurait fait mais retourne `skipped` sans muter la DB. Utilisé en staging
	 * pour valider une nouvelle version de cron sans risquer prod.
	 *
	 * Pour activer : `CRON_DRY_RUN=true` côté Vercel Preview.
	 */
	CRON_DRY_RUN: z.enum(["true", "false"]).optional(),

	// ========================================
	// SEO & Verification (optionnel)
	// ========================================
	NEXT_PUBLIC_SITE_URL: z.url().optional(),
	GOOGLE_SITE_VERIFICATION: z.string().optional(),
	BING_SITE_VERIFICATION: z.string().optional(),

	// ========================================
	// Address Autocomplete (Geoapify - EU countries)
	// ========================================
	GEOAPIFY_API_KEY: z
		.string()
		.min(1, "GEOAPIFY_API_KEY is required for EU address autocomplete")
		.optional(),

	// ========================================
	// Rate Limiting — Listes IP (optionnel, comma-separated)
	// ========================================
	RATE_LIMIT_WHITELIST: z.string().optional(),
	RATE_LIMIT_BLACKLIST: z.string().optional(),

	// ========================================
	// Observability (Sentry)
	// ========================================
	NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	// Token utilisé par le plugin Sentry Webpack pour uploader les sourcemaps
	// au build. Build-time uniquement, jamais exposé runtime.
	SENTRY_AUTH_TOKEN: z.string().optional(),

	// ========================================
	// Healthcheck (sondes externes type UptimeRobot/Better Stack)
	// ========================================
	// Si défini, `/api/health?token=<value>` renvoie le statut détaillé
	// (DB + Stripe + Resend + latences) sans nécessiter une session admin.
	// Doit être ≥32 chars pour limiter le brute-force.
	HEALTHCHECK_TOKEN: z
		.string()
		.min(32, "HEALTHCHECK_TOKEN doit avoir au moins 32 caractères")
		.optional(),

	// ========================================
	// Deployment
	// ========================================
	DEPLOY_DATE: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "DEPLOY_DATE doit être au format YYYY-MM-DD")
		.optional(),
	NEXT_PUBLIC_SITE_PUBLISHED_AT: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "NEXT_PUBLIC_SITE_PUBLISHED_AT doit être au format YYYY-MM-DD")
		.optional(),

	// ========================================
	// Facturation électronique — vendeur (Synclune)
	// ========================================
	// Si non définies, getVendorLegalInfo() (shared/lib/stripe.ts) utilise des
	// fallbacks. Toute valeur définie ici DOIT respecter le format légal pour
	// éviter qu'une faute de frappe dans .env ne se propage sur des factures
	// archivées 10 ans (Art. L102 B LPF).
	VENDOR_LEGAL_NAME: z.string().min(1).optional(),
	VENDOR_TRADE_NAME: z.string().min(1).optional(),
	// ⚠️ NORMALISER PUIS valider, jamais l'inverse. SIREN et SIRET acceptent
	// historiquement les formats INSEE avec espaces ("839 183 027") : brancher
	// directement la SSOT — qui valide la forme CANONIQUE, sans séparateurs — ferait
	// échouer le boot sur un `.env` parfaitement légitime. `stripSpaces` absorbe le
	// groupage, ce qui permet de partager la regex avec `invoice.schema.ts` sans
	// changer ce qui est accepté en entrée (cf. `canonicalFiscal`).
	//
	// Corollaire voulu : la valeur EXPOSÉE par `env` est désormais canonique, comme
	// celle attendue par le snapshot de facture.
	VENDOR_SIREN: canonicalFiscal(
		sirenSchema,
		"VENDOR_SIREN doit avoir 9 chiffres (avec ou sans espaces). Ex: '839 183 027'",
		stripSpaces,
	),
	VENDOR_SIRET: canonicalFiscal(
		siretSchema,
		"VENDOR_SIRET doit avoir 14 chiffres (avec ou sans espaces). Ex: '839 183 027 00037'",
		stripSpaces,
	),
	VENDOR_VAT_NUMBER: canonicalFiscal(
		// La SSOT accepte tous les pays UE ; on garde la restriction FR ici, seule
		// divergence VOULUE avec `invoice.schema.ts` (qui doit pouvoir relire un
		// snapshot intra-UE).
		vatNumberSchema.refine(
			(value) => value.startsWith("FR"),
			"VENDOR_VAT_NUMBER doit être un numéro français (préfixe FR)",
		),
		"VENDOR_VAT_NUMBER doit suivre le format FR (FR + 2 chiffres/lettres + 9 chiffres SIREN). Ex: 'FR35839183027'",
	),
	VENDOR_APE_CODE: canonicalFiscal(
		apeCodeSchema,
		"VENDOR_APE_CODE doit être au format NN.NNL. Ex: '47.91B'",
	),
	VENDOR_FULL_ADDRESS: z.string().min(1).optional(),
	VENDOR_EMAIL: z.email("VENDOR_EMAIL doit être un email valide").optional(),
	VENDOR_VAT_EXEMPTION_TEXT: z.string().min(1).optional(),
	VENDOR_LATE_PAYMENT_PENALTY_RATE: z.string().min(1).optional(),
	VENDOR_RECOVERY_FEE: z.string().min(1).optional(),
	VENDOR_INSURANCE_COMPANY: z.string().min(1).optional(),
	VENDOR_INSURANCE_CONTACT: z
		.email("VENDOR_INSURANCE_CONTACT doit être un email valide")
		.optional(),
	VENDOR_INSURANCE_COVERAGE: z.string().min(1).optional(),
	VENDOR_REGISTRY: z.string().min(1).optional(),
	VENDOR_OPERATION_NATURE: z.string().min(1).optional(),
	// Réforme facturation 2026-2027 — métadonnées Factur-X / UBL / annuaire DGFiP
	VENDOR_LEGAL_FORM: z.string().min(1).optional(),
	VENDOR_VAT_REGIME: z.enum(["FRANCHISE_BASE", "NORMAL", "SIMPLIFIE"]).optional(),
	// Seuil de franchise en base TVA, en euros (défaut 85 000 — ventes de biens).
	// Non validé jusqu'à l'audit franchise TVA 2026-07-27 : une valeur malformée
	// retombait silencieusement sur le défaut, donc le dashboard affichait le bon
	// chiffre en ignorant l'intention de l'opérateur (ex. bascule à 37 500 pour
	// une requalification en prestation de services).
	VAT_FRANCHISE_THRESHOLD_EUR: z.coerce
		.number("VAT_FRANCHISE_THRESHOLD_EUR doit être un nombre d'euros (ex: '85000')")
		.positive("VAT_FRANCHISE_THRESHOLD_EUR doit être strictement positif")
		.optional(),
	// Même traitement : normalisation (les IBAN se saisissent par groupes de 4) puis
	// SSOT partagée avec `invoice.schema.ts`. La borne y passe de `{1,30}` à `{4,30}`
	// — aucun IBAN réel ne fait moins de 15 caractères, l'ancienne laissait donc
	// passer une faute de frappe jusque sur des factures archivées 10 ans.
	VENDOR_BANK_IBAN: canonicalFiscal(ibanSchema, "VENDOR_BANK_IBAN doit être un IBAN valide"),
	VENDOR_BANK_BIC: canonicalFiscal(
		bicSchema,
		"VENDOR_BANK_BIC doit être un BIC valide (8 ou 11 caractères)",
	),

	// ========================================
	// Node
	// ========================================
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Type inféré des variables d'environnement validées
 */
export type Env = z.infer<typeof envSchema>;
