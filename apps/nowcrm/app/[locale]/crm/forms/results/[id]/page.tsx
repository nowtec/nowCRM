import type { PaginationParams } from "@nowcrm/services";
import { surveysService } from "@nowcrm/services/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import DataTable from "@/components/dataTable/data-table";
import ErrorMessage from "@/components/error-message";
import {
	columns,
	renderSubComponent,
} from "../components/columns/survey-columns";
import MassActionsSurveys from "../components/massActions/mass-actions-surveys";

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

	const response = await surveysService.find(session?.jwt, {
		populate: ["contact"],
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
			form_id: { $eq: formId },
		},
	});

	if (!response.success || !response.data || !response.meta) {
		return <ErrorMessage response={response} />;
	}

	const { meta } = response;
	const surveys = response.data;

	return (
		<div className="container">
			<DataTable
				data={surveys}
				columns={columns}
				table_name="surveys"
				table_title="Form Completions"
				mass_actions={MassActionsSurveys}
				pagination={meta.pagination}
				session={session as Session}
				sorting={{ sortBy, sortOrder }}
				renderSubComponent={renderSubComponent}
				hiddenCreate={true}
			/>
		</div>
	);
}
