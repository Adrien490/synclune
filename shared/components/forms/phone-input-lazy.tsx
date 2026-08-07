"use client";

import PhoneInput, { type FlagProps } from "react-phone-number-input";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";

type PhoneInputProps = React.ComponentProps<typeof PhoneInput>;

/**
 * Libellés FRANÇAIS du sélecteur de pays.
 *
 * ⚠️ Sans `labels`, la lib retombe sur `locale/en.json` : le `<select>` des
 * indicatifs prenait `aria-label="Phone number country"` et listait ses **245
 * options en anglais** (« Germany », « Spain »…) au milieu d'un formulaire
 * `lang="fr"` — mesuré au rendu le 2026-08-07. C'était le seul contrôle du
 * tunnel de paiement sans libellé visible ET le seul nommé en anglais
 * (WCAG 3.1.2 Langue d'un passage, 2.4.6 En-têtes et étiquettes).
 *
 * `fr.json` fournit « Numéro de téléphone pays », une traduction littérale peu
 * intelligible à l'oreille : on ne garde que sa table de pays et on réécrit la
 * clé `country`, qui est ce qu'annonce le lecteur d'écran.
 */
const PHONE_LABELS_FR = { ...fr, country: "Pays de l'indicatif téléphonique" };

/**
 * Décalage entre une lettre ASCII majuscule et son INDICATEUR RÉGIONAL Unicode :
 * 'A' (U+0041) → 🇦 (U+1F1E6). Deux indicateurs accolés forment un drapeau.
 */
const REGIONAL_INDICATOR_OFFSET = 0x1f1a5;

/**
 * Drapeau rendu en emoji plutôt qu'en SVG.
 *
 * Pourquoi pas `flags={flags}` (le défaut de la lib) : `react-phone-number-input/flags`
 * réexporte l'**export par défaut** de `country-flag-icons/react/3x2`, un objet qui
 * référence les 272 drapeaux d'un seul et même module — donc **rien n'est tree-shakable**,
 * on embarquait 331 Ko bruts / ~58 Ko gzip pour afficher un drapeau à la fois.
 *
 * Une carte partielle (les 27 pays de `SHIPPING_COUNTRIES`) ne marche pas non plus :
 * quand `flags[country]` est absent, la lib retombe sur `flagUrl`, qui pointe par défaut
 * sur `purecatamphetamine.github.io` — hôte ABSENT de notre `img-src` (cf. CSP dans
 * `next.config.ts`), donc image bloquée. L'emoji n'a ni poids ni requête réseau.
 *
 * ⚠️ Windows ne fournit pas de glyphes de drapeaux (Segoe UI Emoji n'en a pas) : les
 * deux indicateurs régionaux y sont rendus en lettres — « FR », « BE ». C'est lisible,
 * et c'est le compromis assumé. Firefox embarque Twemoji et affiche bien le drapeau.
 *
 * Décoratif : `aria-hidden`. Le nom du pays est déjà porté par le `<select>`
 * `.PhoneInputCountrySelect` que ce visuel ne fait que doubler — l'exposer une
 * seconde fois ferait annoncer « France France » au lecteur d'écran.
 */
function FlagEmoji({ country, countryName }: FlagProps) {
	const flag = String.fromCodePoint(
		...Array.from(country, (letter) => REGIONAL_INDICATOR_OFFSET + letter.charCodeAt(0)),
	);

	return (
		<span aria-hidden="true" title={countryName} className="PhoneInputCountryIconEmoji">
			{flag}
		</span>
	);
}

/**
 * PhoneInput pré-câblé, chargé en lazy par `phone-field.tsx`.
 * Garde react-phone-number-input (~30 Ko) hors du bundle initial.
 */
export default function PhoneInputWithFlags(props: PhoneInputProps) {
	return <PhoneInput labels={PHONE_LABELS_FR} {...props} flagComponent={FlagEmoji} />;
}
