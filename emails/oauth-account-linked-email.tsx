import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";

interface OAuthAccountLinkedEmailProps {
	providerName: string;
	userName: string;
	supportUrl: string;
}

export const OAuthAccountLinkedEmail = ({
	providerName,
	userName,
	supportUrl,
}: OAuthAccountLinkedEmailProps) => (
	<EmailLayout preview={`${providerName} a été lié à votre compte Synclune`}>
		<Section style={{ marginBottom: "24px" }}>
			<EmailHeading level="h1">Nouvelle méthode de connexion</EmailHeading>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Bonjour {userName},
			</Text>
			<Text
				className={EMAIL_CLASSES.text.body}
				style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
			>
				Un compte <strong>{providerName}</strong> vient d'être lié à votre compte Synclune. Vous
				pouvez désormais vous connecter via {providerName} en plus de vos méthodes existantes.
			</Text>
		</Section>

		<EmailCard style={{ marginBottom: "32px" }}>
			<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
				<strong>Ce n'était pas vous ?</strong> Sécurisez votre compte immédiatement en changeant
				votre mot de passe et en contactant notre support.
			</Text>
		</EmailCard>

		<EmailCTA href={supportUrl} marginBottom="24px">
			Contacter le support
		</EmailCTA>
	</EmailLayout>
);

OAuthAccountLinkedEmail.PreviewProps = {
	providerName: "Google",
	userName: "Sophie",
	supportUrl: "https://synclune.fr/contact",
} as OAuthAccountLinkedEmailProps;

export default OAuthAccountLinkedEmail;
