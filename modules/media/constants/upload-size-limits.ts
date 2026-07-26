/**
 * Tailles maximales de fichiers uploadables — SSOT.
 *
 * ⚠️ DOIT rester aligné avec `app/api/uploadthing/core.ts` (`ourFileRouter`),
 * qui est l'autorité d'application côté serveur. Une valeur cliente PLUS HAUTE
 * que la valeur serveur fait téléverser le fichier entier avant un rejet —
 * bande passante et patience gaspillées (cf. `upload-helpers.ts`). Verrouillé
 * par `upload-size-limits.regression.test.ts`.
 *
 * ⚠️ COÛT (audit coûts P2-2) : la vidéo était à 512 Mo × 6, soit 3 Go en un
 * seul upload admin — le quota de stockage UploadThing (2 Go sur le plan
 * gratuit) sautait d'un coup. 64 Mo reste très large pour une vidéo de
 * présentation de bijou (quelques secondes en boucle) et borne le pire cas
 * d'un upload à 128 Mo.
 */

/** Images : 16 Mo. `compress-image.ts` replafonne ensuite à 2048 px. */
export const MAX_UPLOAD_SIZE_IMAGE = 16 * 1024 * 1024;

/** Vidéos : 64 Mo. */
export const MAX_UPLOAD_SIZE_VIDEO = 64 * 1024 * 1024;

/** Nombre maximal de vidéos par upload catalogue. */
export const MAX_UPLOAD_COUNT_VIDEO = 2;

/** Nombre maximal d'images par upload catalogue. */
export const MAX_UPLOAD_COUNT_IMAGE = 6;
