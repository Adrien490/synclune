/**
 * Le mark Synclune, en chemins vectoriels.
 *
 * Obtenu par vectorisation de `public/logo.webp` (256 × 256, opaque) :
 * sur-échantillonnage ×4 lanczos → segmentation « ce qui n'est pas le rose de
 * fond » → contours d'arêtes de pixels → lissage → Douglas-Peucker → cubiques
 * de Catmull-Rom. Le tremblé du feutre survit dans l'asymétrie du cœur ; c'est
 * le bruit d'escalier qui a été retiré, pas la main.
 *
 * ⚠️ Ce n'est PAS le fichier source de Léane, qui n'existe pas dans le dépôt.
 * Aux tailles où la marque vit (28 → 48 px) le rendu est équivalent à l'original ;
 * à 96 px (page « boutique fermée ») le lobe supérieur gauche est légèrement plus
 * charnu. Remplacer ces chemins par le vectoriel d'origine le jour où il arrive.
 *
 * viewBox 0 0 256 256 — les coordonnées sont celles du raster d'origine, ce qui
 * rend toute re-mesure directement comparable.
 */

/** Silhouette du cœur, contour compris. */
export const HEART_PATH =
	"M191.6 48.2C191 50.2 189.2 57.9 188.2 60.4C187.2 63 189 64 185.8 63.7C182.6 63.4 173.6 59.3 169.1 58.4C164.6 57.5 162.3 57.8 158.7 58.2C155 58.5 152.4 58.4 147.4 60.4C142.4 62.4 135.3 70.1 128.6 70.2C121.9 70.2 113.8 62.6 107.1 60.7C100.4 58.7 93.1 58.6 88.3 58.6C83.6 58.6 81.5 59.7 78.4 60.6C75.3 61.6 72.8 62.4 69.9 64.4C67 66.4 63.5 69.8 61 72.5C58.6 75.3 57.1 77.3 55.4 80.9C53.6 84.4 51.5 89.1 50.5 93.8C49.5 98.4 49.5 103.8 49.5 108.7C49.5 113.7 51.7 120.1 50.8 123.6C49.9 127.1 43.9 127.6 44.1 129.6C44.3 131.7 49.6 133.5 51.8 136C54 138.4 55.9 142.9 57.3 144.3C58.7 145.7 59.7 144 60.1 144.3C60.6 144.7 61 145.2 59.9 146.4C58.8 147.6 54.6 150.2 53.4 151.5C52.1 152.8 51.3 152.9 52.4 154.4C53.5 155.9 57.7 158.1 59.9 160.3C62.2 162.6 63.7 163.9 65.8 167.9C67.9 171.9 71.1 181.7 72.4 184.3C73.8 186.9 73.1 186 73.9 183.6C74.6 181.1 76.2 172.7 77.1 169.9C78 167 78.5 167.2 79.2 166.5C79.9 165.8 74.4 160.7 81.5 165.8C88.5 170.8 113.3 191.5 121.5 197C129.8 202.5 127.9 199.3 131 199C134 198.6 134.7 198.2 139.7 195C144.7 191.8 153.1 186.4 161 179.7C168.9 173.1 181.2 161.2 187.1 155.1C193 149 193.5 147.3 196.2 143.2C198.8 139.1 201.2 134.4 202.9 130.7C204.6 127 205.1 122.9 206.2 120.9C207.3 118.8 208.3 120.1 209.6 118.4C210.8 116.7 211.9 112.9 213.8 110.6C215.8 108.4 221.1 106.7 221.1 104.9C221.1 103.1 215.9 102.3 213.9 99.9C211.9 97.4 210.3 92.1 209 90.1C207.7 88.2 206.5 88.7 206.2 87.9C205.8 87.1 206 86.3 206.8 85.3C207.6 84.3 210.3 82.8 211.1 81.8C211.9 80.7 213.2 81 211.5 79C209.8 77 204.1 74.8 200.8 69.7C197.6 64.5 193.3 51.8 191.8 48.2C190.2 44.6 192.2 46.2 191.6 48.2Z";

/**
 * L'INITIALE — le « S » de Synclune — tracée en DÉCOUPE : elle laisse voir le
 * socle au travers.
 *
 * ⚠️ Cette constante s'est appelée `FIVE_PATH` jusqu'au 2026-08-06, et ce nom
 * n'était pas une coquille : le glyphe se lit spontanément « 5 ». Trois lecteurs
 * successifs l'ont nommé ainsi — l'auteur du composant, un agent d'exploration,
 * et l'audit qui a posé la question. C'est un constat d'identité à porter au
 * dessin, pas au code : d'ici là, le nom doit dire l'INTENTION, sinon la
 * prochaine retouche « corrigera » le tracé vers un chiffre.
 */
export const INITIAL_PATH =
	"M146.9 89.9C140.9 90.2 117.7 90.9 111.1 91.4C104.5 91.9 108.4 86 107.2 93C106.1 100 104.4 126.5 104.2 133.3C103.9 140.1 104.2 134.5 105.8 133.7C107.3 132.9 110.8 129.3 113.3 128.3C115.9 127.3 118.2 127.4 121.1 127.7C123.9 128 128 128.5 130.4 130.1C132.9 131.6 135 135 135.9 137.1C136.8 139.3 136.3 141 135.8 143.1C135.3 145.1 133 147 132.9 149.5C132.7 152.1 135 156.4 134.8 158.6C134.6 160.8 133.2 161.8 131.8 162.8C130.4 163.9 128.8 164.4 126.6 164.9C124.4 165.4 121.1 165.9 118.8 165.9C116.6 165.8 115.3 165.7 113.1 164.7C110.8 163.7 106.9 160.6 105.4 159.9C104 159.2 104.3 159.8 104.3 160.5C104.3 161.2 104.5 162.8 105.4 164.3C106.4 165.8 107.4 167.7 110 169.5C112.5 171.4 117.5 174.3 120.6 175.4C123.7 176.5 125.5 176.5 128.6 176.1C131.7 175.6 136.8 173.7 139.3 172.6C141.8 171.5 141.7 171.8 143.7 169.5C145.8 167.1 149.8 162.8 151.5 158.5C153.1 154.2 153.7 147.7 153.6 143.9C153.6 140 152.3 137.7 151.3 135.2C150.4 132.7 149.4 131.1 148 129C146.5 126.9 144.3 124.2 142.6 122.6C140.9 121.1 139.9 120.6 137.7 119.8C135.6 119 132.3 118.2 129.5 117.7C126.8 117.3 122.9 117.9 121.2 117.3C119.6 116.8 119.9 116.5 119.8 114.7C119.7 112.9 120.1 108.4 120.5 106.7C120.8 105 118.4 105.1 122.1 104.6C125.8 104.1 138.4 104.2 142.8 103.7C147.2 103.3 147.5 102.8 148.6 102.1C149.8 101.4 149.5 101.1 149.7 99.5C149.9 97.9 149.9 94 149.7 92.5C149.6 91 149.5 90.9 149 90.5C148.6 90 147.4 90 147.1 89.9C146.7 89.8 152.9 89.7 146.9 89.9Z";

/** Le reflet du lobe supérieur gauche. */
export const GLOSS_PATH =
	"M78.8 76.6C78 77 75.3 77.9 73.9 78.7C72.6 79.4 72.7 78.4 70.9 81.1C69 83.8 64.3 90.5 62.9 94.7C61.6 98.8 62.6 103.4 62.7 106C62.9 108.6 63.2 109.3 63.7 110.3C64.1 111.3 64.6 111.6 65.4 111.9C66.1 112.2 67.5 112.2 68.2 112C68.9 111.7 69.3 113.5 69.8 110.3C70.3 107.1 70.5 97 71.1 92.6C71.8 88.3 73.1 86.4 73.9 84.4C74.7 82.4 75.1 81.8 75.9 80.9C76.7 79.9 78.2 79.2 78.7 78.5C79.3 77.8 78.9 76.9 78.9 76.6C78.9 76.3 79.6 76.2 78.8 76.6Z";

/**
 * Les deux étincelles, chacune une étoile à quatre branches aux côtés creusés.
 *
 * Envergure mesurée sur « plus clair que ce qu'il recouvre » : 56 × 72 px,
 * et non 28 × 24 comme le laissait croire le seul noyau blanc — les bras se
 * fondent en dégradé. Les deux sont la MÊME étoile dupliquée (comptes de pixels
 * identiques au pixel près dans l'original).
 */
export const SPARK_LEFT_PATH =
	"M76 107C76 130.1 85.2 142 103 142C85.2 142 76 153.9 76 177C76 153.9 66.8 142 49 142C66.8 142 76 130.1 76 107Z";

export const SPARK_RIGHT_PATH =
	"M188 58.5C188 81.6 197.2 93.5 215 93.5C197.2 93.5 188 105.4 188 128.5C188 105.4 178.8 93.5 161 93.5C178.8 93.5 188 81.6 188 58.5Z";

/** Centres des étincelles, en % de la boîte — pour les positionner hors du disque. */
export const SPARK_ANCHORS = {
	left: { x: 76 / 256, y: 142 / 256 },
	right: { x: 188 / 256, y: 93.5 / 256 },
} as const;
