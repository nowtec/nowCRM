import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { surveysService } from "@nowcrm/services/server";
import { DocumentId, PaginationParams } from "@nowcrm/services";
import {
	columns,
	renderSubComponent,
} from "./components/columns/surveyColumns";
import DonationTransactionMassActions from "./components/massActions/massActions";

export const metadata: Metadata = {
	title: "Contact surveys",
};
export default async function Page(props: {
	searchParams: Promise<PaginationParams>;
	params: Promise<{ id: DocumentId }>;
}) {
	const t = await getTranslations();
	const params = await props.params;
	const searchParams = await props.searchParams;
	const {
		page = 1,
		pageSize = 10,
		search = "",
		sortBy = "id",
		sortOrder = "desc",
	} = searchParams;
	// Fetch data from the contactService
	const session = await auth();

	const response = await surveysService.find(session?.jwt, {
		populate: "*",
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ name: { $containsi: search } },
				{ form_id: { $containsi: search } },
			],
			contact: { documentId: { $eq: params.id } },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}
	const { meta } = response;

	return (
		<DataTable
			data={response.data}
			columns={columns}
			table_name="surveys"
			table_title={t("Contacts.surveys.table_title")}
			mass_actions={DonationTransactionMassActions}
			pagination={meta.pagination}
			session={session as Session}
			renderSubComponent={renderSubComponent}
			hiddenCreate={true}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
