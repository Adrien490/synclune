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
 * viewBox 0 0 256 256. ⚠️ Depuis le recentrage optique du 2026-08-15, les
 * coordonnées ne sont PLUS celles du raster d'origine : tous les chemins sont
 * décalés de (−4,5, +5,5) pour que la masse du cœur (mesurée à 132,5 / 122,5)
 * tombe sur le centre du disque (128 / 128) — c'est ce qui faisait pencher le
 * mark en haut-droite dans tout cadrage circulaire (favicon, rail admin).
 * Pour re-comparer au raster : ajouter (+4,5, −5,5) à toute coordonnée d'ici.
 */

/** Silhouette du cœur, contour compris. */
export const HEART_PATH =
	"M187.1 53.7C186.5 55.7 184.7 63.4 183.7 65.9C182.7 68.5 184.5 69.5 181.3 69.2C178.1 68.9 169.1 64.8 164.6 63.9C160.1 63 157.8 63.3 154.2 63.7C150.5 64 147.9 63.9 142.9 65.9C137.9 67.9 130.8 75.6 124.1 75.7C117.4 75.7 109.3 68.1 102.6 66.2C95.9 64.2 88.6 64.1 83.8 64.1C79.1 64.1 77 65.2 73.9 66.1C70.8 67.1 68.3 67.9 65.4 69.9C62.5 71.9 59 75.3 56.5 78C54.1 80.8 52.6 82.8 50.9 86.4C49.1 89.9 47 94.6 46 99.3C45 103.9 45 109.3 45 114.2C45 119.2 47.2 125.6 46.3 129.1C45.4 132.6 39.4 133.1 39.6 135.1C39.8 137.2 45.1 139 47.3 141.5C49.5 143.9 51.4 148.4 52.8 149.8C54.2 151.2 55.2 149.5 55.6 149.8C56.1 150.2 56.5 150.7 55.4 151.9C54.3 153.1 50.1 155.7 48.9 157C47.6 158.3 46.8 158.4 47.9 159.9C49 161.4 53.2 163.6 55.4 165.8C57.7 168.1 59.2 169.4 61.3 173.4C63.4 177.4 66.6 187.2 67.9 189.8C69.3 192.4 68.6 191.5 69.4 189.1C70.1 186.6 71.7 178.2 72.6 175.4C73.5 172.5 74 172.7 74.7 172C75.4 171.3 69.9 166.2 77 171.3C84 176.3 108.8 197 117 202.5C125.3 208 123.4 204.8 126.5 204.5C129.5 204.1 130.2 203.7 135.2 200.5C140.2 197.3 148.6 191.9 156.5 185.2C164.4 178.6 176.7 166.7 182.6 160.6C188.5 154.5 189 152.8 191.7 148.7C194.3 144.6 196.7 139.9 198.4 136.2C200.1 132.5 200.6 128.4 201.7 126.4C202.8 124.3 203.8 125.6 205.1 123.9C206.3 122.2 207.4 118.4 209.3 116.1C211.3 113.9 216.6 112.2 216.6 110.4C216.6 108.6 211.4 107.8 209.4 105.4C207.4 102.9 205.8 97.6 204.5 95.6C203.2 93.7 202 94.2 201.7 93.4C201.3 92.6 201.5 91.8 202.3 90.8C203.1 89.8 205.8 88.3 206.6 87.3C207.4 86.2 208.7 86.5 207 84.5C205.3 82.5 199.6 80.3 196.3 75.2C193.1 70 188.8 57.3 187.3 53.7C185.7 50.1 187.7 51.7 187.1 53.7Z";

/**
 * Le « 5 » — le glyphe du cœur, tracé en DÉCOUPE : il laisse voir le socle
 * au travers.
 *
 * ⚠️ C'est un CINQ, et c'est ASSUMÉ (décision du 2026-08-15). L'historique,
 * parce qu'il a déjà fait tourner ce nom en rond : la constante est née
 * `FIVE_PATH` (trois lecteurs indépendants lisaient « 5 »), a été renommée
 * `INITIAL_PATH` le 2026-08-06 au motif que l'intention serait un « S » de
 * Synclune, puis l'audit logo du 2026-08-15 a posé la question et la réponse
 * est : on garde le 5. Il vient du présentoir d'atelier de Léane
 * (`docs/BRAND-DA.md` § univers photographique : « présentoir illustré jaune
 * (chiffre 5, formes de cœur et d'étoile) ») — le logo dessine un objet réel.
 * Ne PAS « corriger » ce tracé vers un S ; l'histoire du 5 est à raconter par
 * Léane (cf. `docs/BRAND-DA.md` § Le logo).
 */
export const FIVE_PATH =
	"M142.4 95.4C136.4 95.7 113.2 96.4 106.6 96.9C100 97.4 103.9 91.5 102.7 98.5C101.6 105.5 99.9 132 99.7 138.8C99.4 145.6 99.7 140 101.3 139.2C102.8 138.4 106.3 134.8 108.8 133.8C111.4 132.8 113.7 132.9 116.6 133.2C119.4 133.5 123.5 134 125.9 135.6C128.4 137.1 130.5 140.5 131.4 142.6C132.3 144.8 131.8 146.5 131.3 148.6C130.8 150.6 128.5 152.5 128.4 155C128.2 157.6 130.5 161.9 130.3 164.1C130.1 166.3 128.7 167.3 127.3 168.3C125.9 169.4 124.3 169.9 122.1 170.4C119.9 170.9 116.6 171.4 114.3 171.4C112.1 171.3 110.8 171.2 108.6 170.2C106.3 169.2 102.4 166.1 100.9 165.4C99.5 164.7 99.8 165.3 99.8 166C99.8 166.7 100 168.3 100.9 169.8C101.9 171.3 102.9 173.2 105.5 175C108 176.9 113 179.8 116.1 180.9C119.2 182 121 182 124.1 181.6C127.2 181.1 132.3 179.2 134.8 178.1C137.3 177 137.2 177.3 139.2 175C141.3 172.6 145.3 168.3 147 164C148.6 159.7 149.2 153.2 149.1 149.4C149.1 145.5 147.8 143.2 146.8 140.7C145.9 138.2 144.9 136.6 143.5 134.5C142 132.4 139.8 129.7 138.1 128.1C136.4 126.6 135.4 126.1 133.2 125.3C131.1 124.5 127.8 123.7 125 123.2C122.3 122.8 118.4 123.4 116.7 122.8C115.1 122.3 115.4 122 115.3 120.2C115.2 118.4 115.6 113.9 116 112.2C116.3 110.5 113.9 110.6 117.6 110.1C121.3 109.6 133.9 109.7 138.3 109.2C142.7 108.8 143 108.3 144.1 107.6C145.3 106.9 145 106.6 145.2 105C145.4 103.4 145.4 99.5 145.2 98C145.1 96.5 145 96.4 144.5 96C144.1 95.5 142.9 95.5 142.6 95.4C142.2 95.3 148.4 95.2 142.4 95.4Z";

/** Le reflet du lobe supérieur gauche. */
export const GLOSS_PATH =
	"M74.3 82.1C73.5 82.5 70.8 83.4 69.4 84.2C68.1 84.9 68.2 83.9 66.4 86.6C64.5 89.3 59.8 96 58.4 100.2C57.1 104.3 58.1 108.9 58.2 111.5C58.4 114.1 58.7 114.8 59.2 115.8C59.6 116.8 60.1 117.1 60.9 117.4C61.6 117.7 63 117.7 63.7 117.5C64.4 117.2 64.8 119 65.3 115.8C65.8 112.6 66 102.5 66.6 98.1C67.3 93.8 68.6 91.9 69.4 89.9C70.2 87.9 70.6 87.3 71.4 86.4C72.2 85.4 73.7 84.7 74.2 84C74.8 83.3 74.4 82.4 74.4 82.1C74.4 81.8 75.1 81.7 74.3 82.1Z";

/**
 * Les deux étincelles, chacune une étoile à quatre branches aux côtés creusés.
 *
 * Envergure mesurée sur « plus clair que ce qu'il recouvre » : 56 × 72 px,
 * et non 28 × 24 comme le laissait croire le seul noyau blanc — les bras se
 * fondent en dégradé. Les deux sont la MÊME étoile dupliquée (comptes de pixels
 * identiques au pixel près dans l'original).
 */
export const SPARK_LEFT_PATH =
	"M71.5 112.5C71.5 135.6 80.7 147.5 98.5 147.5C80.7 147.5 71.5 159.4 71.5 182.5C71.5 159.4 62.3 147.5 44.5 147.5C62.3 147.5 71.5 135.6 71.5 112.5Z";

export const SPARK_RIGHT_PATH =
	"M183.5 64C183.5 87.1 192.7 99 210.5 99C192.7 99 183.5 110.9 183.5 134C183.5 110.9 174.3 99 156.5 99C174.3 99 183.5 87.1 183.5 64Z";

/** Centres des étincelles, en % de la boîte — pour les positionner hors du disque. */
export const SPARK_ANCHORS = {
	left: { x: 71.5 / 256, y: 147.5 / 256 },
	right: { x: 183.5 / 256, y: 99 / 256 },
} as const;
