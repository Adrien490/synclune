/**
 * Rapatrie une photo distante en data-URI VALIDÉ avant de la confier à Satori.
 *
 * ⚠️ Ne jamais mettre l'URL distante brute dans le `src` d'un `<img>` de carte
 * OG : c'est alors Satori qui fetch, et un upstream qui répond une page
 * d'erreur HTML (constaté avec les visuels de seed picsum sous la charge du
 * run e2e, lot 7) fait échouer le décodage (« Input buffer contains
 * unsupported image format ») — et l'échec EMPOISONNE l'instance de rendu du
 * process : toutes les cartes OG suivantes, même sans photo, répondaient vides
 * (« failed to pipe response ») jusqu'au redémarrage du serveur.
 *
 * Ici : timeout court, statut et content-type vérifiés, formats restreints à
 * ce que Satori décode. Toute anomalie rend `null` — l'appelant omet la photo,
 * la carte reste servie.
 */
const SATORI_SAFE_IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)/;

export async function fetchOgImageAsDataUri(
	url: string | null | undefined,
): Promise<string | null> {
	if (!url) return null;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
		const contentType = response.headers.get("content-type") ?? "";
		if (!response.ok || !SATORI_SAFE_IMAGE_TYPES.test(contentType)) return null;
		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.length === 0) return null;
		return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
	} catch {
		return null;
	}
}
