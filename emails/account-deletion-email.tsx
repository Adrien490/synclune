import { Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface AccountDeletionEmailProps {
	userName: string;
	deletionDate: string;
}

export const AccountDeletionEmail = ({
	userName,
	deletionDate,
}: AccountDeletionEmailProps) => (
	<EmailLayout preview="Votre compte a été supprimé">
		{/* Titre */}
		<Section style={{ marginBottom: "24px" }}>
			<Text style={EMAIL_STYLES.heading.h2}>Compte supprimé</Text>
			<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
				Bonjour {userName}, votre compte Synclune a été supprimé le{" "}
				{deletionDate} conformément à votre demande.
			</Text>
		</Section>

		{/* Info retention */}
		<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
			<Text
				style={{
					...EMAIL_STYLES.text.body,
					margin: 0,
					fontWeight: "600",
				}}
			>
				Conservation légale des données
			</Text>
			<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
				Conformément à l'article L123-22 du Code de Commerce, les données
				relatives à vos commandes et factures sont conservées pendant 10 ans
				à des fins comptables et fiscales. Vos données personnelles
				(nom, email, adresse) ont été anonymisées.
			</Text>
		</Section>

		{/* Contact */}
		<Section style={{ marginBottom: "32px" }}>
			<Text style={EMAIL_STYLES.text.body}>
				Si vous avez des questions, n'hésitez pas à nous contacter.
				Nous vous remercions pour votre confiance.
			</Text>
		</Section>
	</EmailLayout>
);

AccountDeletionEmail.PreviewProps = {
	userName: "Marie",
	deletionDate: "17 février 2026",
} as AccountDeletionEmailProps;

export default AccountDeletionEmail;
