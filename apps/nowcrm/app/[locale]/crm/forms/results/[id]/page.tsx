import type { Session } from "next-auth";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/dataTable";
import ErrorMessage from "@/components/ErrorMessage";

import { columns } from "../components/columns/surveyItemsColumns";
import CreateFormItemDialog from "../components/createDialog";
import MassActionsSurveyItems from "../components/massActions/massActions";
import { PaginationParams } from "@nowcrm/services";
import { surveyItemsService } from "@nowcrm/services/server";

export default async function Page(props: {
	params: Promise<{ id: number }>;
	searchParams: Promise<PaginationParams>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const {
		page = 1,
		pageSize = 10,
		search = "",
		sortBy = "id",
		sortOrder = "desc",
	} = searchParams;

	const { id } = params;

	const formId = String(id);

	const session = await auth();

	const response = await surveyItemsService.find(session?.jwt, {
		populate: ["survey", "file"],
		sort: [`${sortBy}:${sortOrder}` as any],
		pagination: {
			page,
			pageSize,
		},
		filters: {
			$or: [
				{ answer: { $containsi: search } },
				{ question: { $containsi: search } },
			],
			survey: { form_id: { $eq: formId } },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}

	const { meta } = response;
	const items = response.data;

	return (
		<div className="container">
			<DataTable
				data={items}
				columns={columns}
				table_name="survey_items"
				table_title="Survey Items"
				mass_actions={MassActionsSurveyItems}
				pagination={meta.pagination}
				createDialog={CreateFormItemDialog}
				session={session as Session}
				sorting={{ sortBy, sortOrder }}
			/>
		</div>
	);
}
