"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { taskStatuses } from "@nowcrm/services";
import { format } from "date-fns";
import { CalendarDays, Clock, ListPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GrAddCircle } from "react-icons/gr";
import * as z from "zod";
import { AsyncSelectField } from "@/components/autoComplete/async-select-field";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
	contact: z.string(),
	name: z.string(),
	description: z.string().optional(),
	action: z.string().optional(),
	assigned_to: z.object({
		value: z.string(),
		label: z.string(),
	}),
	due_date: z.date(),
	status: z.enum(["planned", "in progress", "done", "expired"]).optional(),
});

export default function CreateTaskDialog() {
	const router = useRouter();
	const params = useParams<{ locale: string; id: string }>();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [datetimeOpen, setDatetimeOpen] = React.useState(false);
	const t = useTranslations();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			contact: params.id,
			name: "",
			assigned_to: undefined,
			description: "",
			action: "",
			due_date: undefined,
			status: "planned",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const { default: toast } = await import("react-hot-toast");
		const { createTask } = await import("@/lib/actions/tasks/create-task");
		const { status, ...rest } = values
		console.log(values)
		const updated_values = {
			...rest,
			task_status: status as taskStatuses,
			due_date: values.due_date,
			assigned_to: values.assigned_to.value,
		};
		const res = await createTask({
			...updated_values,
			publishedAt: new Date(),
		});

		if (!res.success) {
			toast.error(`${t("Contacts.tasks.error")} ${res.errorMessage}`);
		} else {
			toast.success(
				t("Contacts.tasks.success", { name: values.description || "" }),
			);
			setDialogOpen(false);
			form.reset();
			router.refresh();
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="ml-2 hidden h-8 lg:flex"
					onClick={() => setDialogOpen(true)}
				>
					<GrAddCircle className="mr-2 h-4 w-4" />
					{t("Contacts.tasks.createTask")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t("Contacts.tasks.createTask")}</DialogTitle>
					<DialogDescription>
						{t("Contacts.tasks.description")}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.name")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.tasks.fields.name")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>
										{t("Contacts.tasks.fields.description")}
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder={t("Contacts.tasks.fields.description")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="action"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.action")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t("Contacts.tasks.fields.action")}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="due_date"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.dueDate")}</FormLabel>
									<Popover open={datetimeOpen} onOpenChange={setDatetimeOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className="w-full justify-start text-left font-normal bg-transparent"
												>
													<CalendarDays className="mr-2 h-4 w-4" />
													{field.value ? (
														<div className="flex items-center gap-2">
															<span>{format(field.value, "PPP")}</span>
															<Clock className="h-3 w-3" />
															<span>{format(field.value, "HH:mm")}</span>
														</div>
													) : (
														<span>{t("Contacts.tasks.fields.dueDate")}</span>
													)}
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<div className="p-3 border-b">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={(date) => {
														if (date) {
															// Preserve the time when selecting a new date
															const currentTime = field.value || new Date();
															const newDateTime = new Date(date);
															newDateTime.setHours(currentTime.getHours());
															newDateTime.setMinutes(currentTime.getMinutes());
															field.onChange(newDateTime);
														}
													}}
													defaultMonth={field.value || new Date()}
												/>
											</div>
											<div className="p-3 space-y-2">
												<Label className="text-sm font-medium">Time</Label>
												<div className="flex gap-2">
													<Input
														type="time"
														value={
															field.value
																? format(field.value, "HH:mm")
																: "09:00"
														}
														onChange={(e) => {
															const [hours, minutes] = e.target.value.split(":");
															const newDateTime = new Date(
																field.value || new Date(),
															);
															newDateTime.setHours(
																Number.parseInt(hours, 10),
																Number.parseInt(minutes, 10),
															);
															field.onChange(newDateTime);
														}}
														className="flex-1"
													/>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => setDatetimeOpen(false)}
													>
														Done
													</Button>
												</div>
											</div>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>
						<AsyncSelectField
							name="assigned_to"
							label={t("Contacts.tasks.fields.assignTo")}
							serviceName="usersService"
							form={form}
							filterKey="username"
							useFormClear={false}
						/>
						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>{t("Contacts.tasks.fields.status")}</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue
													placeholder={t("Contacts.tasks.fields.status")}
												/>
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="planned">
												{t("Contacts.tasks.fields.statusOptions.planned")}
											</SelectItem>
											<SelectItem value="in progress">
												{t("Contacts.tasks.fields.statusOptions.in progress")}
											</SelectItem>
											<SelectItem value="done">
												{t("Contacts.tasks.fields.statusOptions.done")}
											</SelectItem>
											<SelectItem value="expired">
												{t("Contacts.tasks.fields.statusOptions.expired")}
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full">
							<ListPlus className="mr-2 h-4 w-4" />
							{t("common.actions.create")}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
