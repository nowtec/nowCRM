import type { DocumentId } from "@nowcrm/services";
import { compositionsService } from "@nowcrm/services/server";
import { auth } from "@/auth";
import ErrorMessage from "@/components/error-message";
import { CompositionView } from "./components/composition-view";

// This would be replaced with your actual data fetching logic

export default async function CompositionPage(props: {
	params: Promise<{ id: DocumentId }>;
}) {
	const session = await auth();
	const params = await props.params;
	const response = await compositionsService.findOne(params.id, session?.jwt, {
		populate: {
			composition_items: {
				populate: ["channel", "attached_files"],
			},
		},
	});
	if (!response.success || !response.data) {
		return <ErrorMessage response={response} />;
	}
	return <CompositionView composition={response.data} />;
}
