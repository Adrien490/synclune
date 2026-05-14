/**
 * Cap centralisé pour les actions bulk admin (banner « Sélectionner les N filtrés »
 * + bulk-archive/delete/status/role/etc.).
 *
 * Single source of truth — réutilisé par les 9 `BULK_*_ACTION_LIMIT` per-module
 * pour garantir une UX cohérente : qu'on bulk des produits, commandes ou clients,
 * le cap (et donc le badge « (max) ») est le même.
 *
 * Si tu veux changer le cap (impact storage Set côté client + temps de Promise.all
 * find+count), modifie-le ici — les 9 actions héritent.
 *
 * 100 = compromise entre :
 * - assez pour les bulk fréquents (archiver une session de 50-80 brouillons d'un coup)
 * - pas trop pour la mémoire Set client + la requête prisma count() (cardinality OK)
 */
export const BULK_SELECTION_MAX = 100;
