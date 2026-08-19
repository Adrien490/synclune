// Point d'entrée de la galerie produit — seule `Gallery` est consommée hors
// du dossier (PDP) : le chrome (compteur, chevrons, loupe, indice tap), le
// zoom et le préchauffage s'importent par fichier, entre voisins. Rapatrié de
// `shared/components/gallery/` (2026-08-16) : la couche cross-cutting
// importait le module media et n'avait aucun autre consommateur — la
// frontière était inversée.
export { Gallery } from "./gallery";
