/**
 * Media limits, supported extensions, and MIME types.
 *
 * ⚠️ Ce fichier est **client-safe** (aucun import serveur) : c'est précisément ce
 * qui lui permet de porter la SSOT des types MIME acceptés, consommée à la fois
 * par le FileRouter (`app/api/uploadthing/core.ts`, server-only à cause de Sharp)
 * et par la validation cliente (`modules/media/utils/upload-helpers.ts`). Ne JAMAIS
 * y importer `core.ts` — l'inverse seulement.
 */

// ============================================================================
// MEDIA LIMITS
// ============================================================================

/** Maximum number of images in the product gallery (across all VARIANTs) */
export const MAX_GALLERY_IMAGES = 20;

// ============================================================================
// SUPPORTED EXTENSIONS
// ============================================================================

/** Supported video extensions (MP4 only for universal cross-browser compatibility) */
export const VIDEO_EXTENSIONS = [".mp4"] as const;

/** Supported image extensions */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"] as const;

/**
 * Extensions iPhone, listées à part : `.heic`/`.heif` ne figurent pas dans
 * `IMAGE_EXTENSIONS` (aucune URL servie ne porte ces extensions — le serveur
 * ré-encode en WebP) mais doivent apparaître dans les `accept` des pickers et
 * dans le repli par extension, car iOS Safari rend parfois un MIME vide.
 */
export const HEIC_EXTENSIONS = [".heic", ".heif"] as const;

/**
 * MIME HEIC/HEIF, variantes `-sequence` (burst iPhone) comprises — SSOT
 * partagée entre le décodage client (`compress-image`) et le ré-encodage
 * serveur (`reencode-heic.service`), qui portaient chacun leur copie.
 */
export const HEIC_MIME_TYPES = [
	"image/heic",
	"image/heif",
	"image/heic-sequence",
	"image/heif-sequence",
] as const;

// ============================================================================
// ACCEPTED MIME TYPES — SSOT partagée client / serveur
// ============================================================================

/**
 * Types MIME image acceptés. **SVG volontairement exclu** : un SVG peut embarquer
 * du script (vecteur XSS). HEIC/HEIF sont tolérés bruts — le client les ré-encode
 * normalement, mais le serveur sait les convertir en WebP si la compression cliente
 * a échoué silencieusement.
 *
 * Appliqué côté serveur par `validateMimeType` (`app/api/uploadthing/core.ts`) et
 * côté client par `isValidMediaType` (`upload-helpers.ts`). L'identité des deux
 * listes est verrouillée par `client-mime-allowlist.regression.test.ts`.
 */
export const ACCEPTED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/avif",
	"image/heic",
	"image/heif",
] as const;

/** Types MIME vidéo acceptés — MP4 seul, pour la compatibilité navigateur universelle. */
export const ACCEPTED_VIDEO_MIME_TYPES = ["video/mp4"] as const;

// ============================================================================
// ACCEPT ATTRIBUTES (pickers natifs)
// ============================================================================

/**
 * `accept` des surfaces catalogue (images + vidéos).
 *
 * ⚠️ Énumération explicite, et non `"image/*,video/*"` : un joker laissait le
 * picker natif proposer un `.mov` (`video/quicktime`) ou un `.svg` que le serveur
 * refuse — jusqu'à 64 Mo téléversés avant le rejet. Le correctif « M13 » n'avait
 * fermé que le repli par extension, pas le chemin MIME normal.
 */
export const ACCEPT_ATTRIBUTE_CATALOG = [
	...ACCEPTED_IMAGE_MIME_TYPES,
	...ACCEPTED_VIDEO_MIME_TYPES,
	...HEIC_EXTENSIONS,
].join(",");

/** `accept` des surfaces d'upload limitées aux images (pas de vidéo). */
export const ACCEPT_ATTRIBUTE_IMAGES_ONLY = [...ACCEPTED_IMAGE_MIME_TYPES, ...HEIC_EXTENSIONS].join(
	",",
);

// ============================================================================
// DISPLAY LABELS (SSOT for upload-zone copy)
// ============================================================================

/**
 * Human-readable list of accepted image formats, shown in upload-zone hints.
 * Derived from IMAGE_EXTENSIONS (JPG/JPEG collapsed to "JPEG") + HEIC, which is
 * accepted server-side and auto-converted to WebP.
 */
export const IMAGE_FORMATS_LABEL = "JPEG, PNG, GIF, WebP, AVIF, HEIC";

/** Human-readable list of accepted video formats, shown in upload-zone hints. */
export const VIDEO_FORMATS_LABEL = "MP4";

/**
 * Règle « le premier média est l'image principale » — **une seule formulation**.
 *
 * ⚠️ Elle existait en trois versions pour une même contrainte, dont une fautive :
 * « La première **image** doit être une image, pas une vidéo » (tautologie),
 * « La première position doit être une image, pas une vidéo. » et celle-ci. Selon
 * qu'on réordonnait, supprimait ou soumettait, l'utilisatrice lisait un texte
 * différent pour le même refus.
 */
export const PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE =
	"Le premier média doit être une image, pas une vidéo.";
