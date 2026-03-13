# Idees de Nouvelles Fonctionnalites — Synclune

## Contexte

Synclune est un e-commerce bijoux artisanaux tres complet (9+/10 sur la plupart des audits). Le projet a deja : storefront, admin, Stripe, 36 emails, 17 crons, reviews, wishlist, newsletter, customisation, refunds, discounts, PWA, fuzzy search, RGPD. Les idees ci-dessous ciblent des fonctionnalites a **forte valeur ajoutee** qui manquent et qui sont pertinentes pour un e-commerce bijoux artisanal en micro-entreprise FR.

---

## Tier 1 — Fort impact business (conversion & fidelisation)

### 1. Programme de fidelite / Points

- Gagner des points a chaque achat (1EUR = 1 point)
- Points bonus sur premiere commande, anniversaire, parrainage
- Echange points -> reduction sur prochaine commande
- Dashboard client avec solde de points et historique
- Admin : configurer le ratio points/euros, gerer les bonus
- **Pourquoi** : Augmente le taux de reachat (LTV). Tres attendu en bijouterie ou le panier moyen est modere.

### 2. Gift Cards / Cartes cadeaux

- Acheter une carte cadeau (montant libre ou predefini : 25EUR, 50EUR, 100EUR)
- Email avec code unique + design bijou
- Appliquer comme moyen de paiement au checkout
- Solde partiel possible (utiliser 30EUR sur une carte de 50EUR)
- Admin : voir les cartes emises, soldes, expirations
- **Pourquoi** : Genere des ventes sans effort marketing. Tres populaire en bijouterie (cadeaux).

### 3. Emballage cadeau & Message personnalise

- Option au checkout : emballage cadeau (+XEUR ou gratuit)
- Champ texte pour message personnalise (carte jointe)
- Choix d'emballage (ecrin, pochette, boite)
- Affichage dans le detail commande admin
- **Pourquoi** : Les bijoux sont souvent des cadeaux. Augmente le panier moyen et l'experience client.

### 4. Systeme de parrainage

- Chaque client a un lien/code de parrainage unique
- Le parrain recoit une reduction quand le filleul commande
- Le filleul recoit une reduction sur sa premiere commande
- Dashboard client : suivi des parrainages
- Admin : configurer les montants, voir les stats
- **Pourquoi** : Acquisition client organique a cout quasi nul.

---

## Tier 2 — Differenciation & engagement

### 5. Lookbook / Galerie d'inspirations

- Page editoriale avec photos stylisees de bijoux portes
- Liens directs vers les produits presents dans chaque photo
- Filtrage par occasion (mariage, quotidien, soiree)
- Admin : uploader des photos, tagger les produits
- **Pourquoi** : Le visuel est crucial en bijouterie. Inspire l'achat et ameliore le SEO (images).

### 6. Guide des tailles interactif

- Outil visuel pour mesurer sa taille de bague/bracelet
- Impression d'un gabarit PDF de mesure
- Recommandation basee sur les achats precedents
- Integre a la page produit (modale)
- **Pourquoi** : Reduit les retours (cause #1 de retour en bijouterie = mauvaise taille).

### 7. Wishlist partageable / Liste de souhaits

- La wishlist existe deja, mais la rendre partageable via lien public
- Page publique "Liste de souhaits de [Prenom]"
- Ideal pour anniversaires, Noel, mariages
- Option de marquer un article comme "offert" (pour eviter les doublons)
- **Pourquoi** : Transforme la wishlist en outil d'acquisition (partage social).

### 8. Blog / Journal de l'atelier

- Articles sur les techniques, les materiaux, les coulisses de creation
- SEO : contenu long format avec mots-cles bijouterie
- Liens vers les produits mentionnes
- Categories : inspirations, entretien, actualites
- Admin : editeur WYSIWYG, brouillons, publication programmee
- **Pourquoi** : SEO organique + positionnement artisanal + engagement.

---

## Tier 3 — Ameliorations operationnelles

### 9. Notifications push (PWA)

- Le projet est deja PWA (Serwist), mais pas de notifications push
- Alertes : commande expediee, retour en stock wishlist, vente flash
- Opt-in/opt-out granulaire par type de notification
- **Pourquoi** : Canal de communication direct, taux d'ouverture 5-10x superieur aux emails.

### 10. Systeme de precommande / Coming Soon

- Produits marques "Bientot disponible" avec bouton "Me prevenir"
- Collecte d'emails d'intention d'achat avant le lancement
- Notification automatique quand le produit est disponible
- Option de precommande avec paiement differe
- **Pourquoi** : Cree de l'anticipation et valide la demande avant production.

### 11. Dashboard analytics avance (admin)

- Le dashboard actuel a KPIs + revenue chart + recent orders
- Ajouter : taux de conversion, panier moyen, produits les plus vus vs achetes
- Cohortes clients (nouveau vs recurrent)
- Top produits par revenu, par marge, par avis
- Graphique d'entonnoir checkout (ajout panier -> paiement -> confirmation)
- Export PDF du rapport mensuel
- **Pourquoi** : Aide a prendre des decisions eclairees sur le catalogue et le marketing.

### 12. Gestion des retours amelioree

- Le systeme de refunds existe, mais pas de portail client self-service
- Le client initie sa demande de retour depuis son espace (motif, photos)
- Generation automatique d'etiquette retour (Colissimo API)
- Suivi du retour cote client et admin
- **Pourquoi** : Reduit la charge admin et ameliore l'experience post-achat.

---

## Tier 4 — Innovation & experimentation

### 13. Gravure / Personnalisation en ligne

- Le module customization existe pour des demandes libres
- Ajouter une personnalisation structuree : gravure texte (prenom, date, initiales)
- Previsualisation en temps reel sur la photo du produit (canvas/SVG)
- Supplement de prix configurable par produit
- Polices et limites de caracteres configurables
- **Pourquoi** : Les bijoux graves ont une marge superieure et un taux de retour quasi nul.

### 14. Configurateur de bijou (Build Your Own)

- Choisir une base (bague, collier, bracelet)
- Selectionner le materiau (argent, or, vermeil)
- Ajouter des pierres / pendentifs
- Prix calcule dynamiquement
- Rendu visuel en temps reel
- **Pourquoi** : Experience premium, panier moyen eleve, differenciation forte.

### 15. Live Shopping / Ventes ephemeres

- Page de vente flash avec countdown timer
- Stock limite visible (urgence)
- Notification push/email aux abonnes
- Historique des ventes flash passees
- **Pourquoi** : Cree de l'urgence et des pics de trafic planifiables.

---

## Recapitulatif par effort d'implementation

| Fonctionnalite             | Effort | Impact | Priorite suggeree |
| -------------------------- | ------ | ------ | ----------------- |
| Emballage cadeau & message | S      | Fort   | 1                 |
| Guide des tailles          | S      | Fort   | 2                 |
| Wishlist partageable       | S      | Moyen  | 3                 |
| Precommande / Coming Soon  | M      | Fort   | 4                 |
| Gift Cards                 | M      | Fort   | 5                 |
| Parrainage                 | M      | Fort   | 6                 |
| Lookbook                   | M      | Moyen  | 7                 |
| Gravure en ligne           | M      | Fort   | 8                 |
| Programme fidelite         | L      | Fort   | 9                 |
| Blog / Journal             | L      | Moyen  | 10                |
| Portail retours client     | M      | Moyen  | 11                |
| Dashboard analytics avance | L      | Moyen  | 12                |
| Notifications push         | M      | Moyen  | 13                |
| Ventes flash               | M      | Moyen  | 14                |
| Configurateur bijou        | XL     | Fort   | 15                |

**S** = 1-3 jours, **M** = 3-7 jours, **L** = 1-2 semaines, **XL** = 2+ semaines
