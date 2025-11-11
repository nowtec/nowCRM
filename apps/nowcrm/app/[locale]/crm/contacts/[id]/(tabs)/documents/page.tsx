import type { Metadata } from "next";
import type { Session } from "next-auth";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";
import { columns } from "./components/columns/documentColumns";
import DocumentsMassActions from "./components/massActions/massActions";
import { DocumentId, PaginationParams } from "@nowcrm/services";
import { contactDocumentsService } from "@nowcrm/services/server";

export const metadata: Metadata = {
	title: "Contact documents",
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
	const response = await contactDocumentsService.find(session?.jwt, {
		sort: [`${sortBy}:${sortOrder}` as any],
		populate: "*",
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [{ name: { $containsi: search } }],
			contact: { documentId: { $in: params.id } },
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
			table_name="documents"
			table_title={t("Contacts.documents.table_title")}
			mass_actions={DocumentsMassActions}
			pagination={meta.pagination}
			session={session as Session}
			hiddenCreate={true}
			sorting={{ sortBy, sortOrder }}
		/>
	);
}
