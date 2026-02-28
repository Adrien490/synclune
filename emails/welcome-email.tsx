import { Button, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface WelcomeEmailProps {
	userName: string;
	shopUrl: string;
}

export const WelcomeEmail = ({ userName, shopUrl }: WelcomeEmailProps) => (
	<EmailLayout preview="Bienvenue chez Synclune">
		{/* Titre */}
		<Section style={{ marginBottom: "24px" }}>
			<Text style={EMAIL_STYLES.heading.h2}>Bienvenue {userName} !</Text>
			<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
				Votre compte est maintenant actif. Merci de rejoindre l'univers Synclune.
			</Text>
		</Section>

		{/* Description de la marque */}
		<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
			<Text style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
				Chaque bijou Synclune est une pièce unique, dessinée et assemblée à la main dans notre
				atelier à Nantes. Découvrez nos collections et trouvez la création qui vous ressemble.
			</Text>
		</Section>

		{/* CTA */}
		<Section style={{ marginBottom: "32px", textAlign: "center" }}>
			<Button href={shopUrl} style={EMAIL_STYLES.button.primary}>
				Découvrir les créations
			</Button>
		</Section>
	</EmailLayout>
);

WelcomeEmail.PreviewProps = {
	userName: "Marie",
	shopUrl: "https://synclune.fr/produits",
} as WelcomeEmailProps;

export default WelcomeEmail;
