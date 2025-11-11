import ErrorMessage from "@/components/ErrorMessage";
import { AddressCard } from "./components/addressInfo/AddressInfoCard";
import { PersonalInfoCard } from "./components/personalInfo/personalInfocard";
import { ProfessionalInfoCard } from "./components/professionalInfo/professionalInforCard";
import { contactsService } from "@nowcrm/services/server";
import { DocumentId } from "@nowcrm/services";
import { auth } from "@/auth";

export default async function Home(props: { params: Promise<{ id: DocumentId }> }) {
	const params = await props.params;
	const session = await auth();
	const contact = await contactsService.findOne(params.id,session?.jwt, {
		populate: "*",
	});

	if (!contact.data || !contact.success) {
		return <ErrorMessage response={contact} />;
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<PersonalInfoCard contact={contact.data} />
			<AddressCard contact={contact.data} />
			<ProfessionalInfoCard contact={contact.data} />
		</div>
	);
}
