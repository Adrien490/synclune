import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface WelcomeEmailProps {
	userName: string;
	shopUrl: string;
}

export const WelcomeEmail = ({ userName, shopUrl }: WelcomeEmailProps) => (
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

		<EmailCTA href={shopUrl} marginBottom="32px">
			Découvrir les créations
		</EmailCTA>
	</EmailLayout>
);

WelcomeEmail.PreviewProps = {
	userName: "Marie",
	shopUrl: "https://synclune.fr/produits",
} as WelcomeEmailProps;

export default WelcomeEmail;
