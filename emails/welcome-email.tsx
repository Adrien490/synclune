import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface WelcomeEmailProps {
	userName: string;
	shopUrl: string;
	newsletterUrl: string;
}

export const WelcomeEmail = ({ userName, shopUrl, newsletterUrl }: WelcomeEmailProps) => (
	<EmailLayout preview="Bienvenue chez Synclune">
		<Section style={{ marginBottom: "24px" }}>
			<EmailHeading level="h1">Bienvenue {userName} !</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Votre compte est maintenant actif. Merci de rejoindre l'univers Synclune.
			</Text>
		</Section>

		<EmailCard style={{ marginBottom: "24px" }}>
			<Text className={EMAIL_CLASSES.text.body} style={{ ...EMAIL_STYLES.text.body, margin: 0 }}>
				Chaque bijou Synclune est une pièce unique, dessinée et assemblée à la main dans notre
				atelier. Découvrez nos collections et trouvez la création qui vous ressemble.
			</Text>
		</EmailCard>

		<EmailCTA href={shopUrl} marginBottom="24px">
			Découvrir les créations
		</EmailCTA>

		<EmailCard style={{ marginBottom: "32px", textAlign: "center" }}>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, fontWeight: "600", marginBottom: "8px" }}
			>
				Envie de -10% sur votre première commande ?
			</Text>
			<Text
				className={EMAIL_CLASSES.text.secondary}
				style={{ ...EMAIL_STYLES.text.small, marginBottom: "16px" }}
			>
				Inscrivez-vous à la newsletter pour recevoir votre code promo et nos dernières nouveautés.
			</Text>
			<EmailCTA href={newsletterUrl} variant="outline" marginBottom="0">
				S'inscrire à la newsletter
			</EmailCTA>
		</EmailCard>
	</EmailLayout>
);

WelcomeEmail.PreviewProps = {
	userName: "Marie",
	shopUrl: "https://synclune.fr/produits",
	newsletterUrl: "https://synclune.fr/#newsletter",
} as WelcomeEmailProps;

export default WelcomeEmail;
