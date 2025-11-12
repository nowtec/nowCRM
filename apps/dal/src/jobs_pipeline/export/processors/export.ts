import path from "node:path";
import { stringify } from "csv-stringify";
import fs from "fs-extra";
import nodemailer from "nodemailer";
import { env } from "@/common/utils/env-config";
import { fetchPage } from "@/jobs_pipeline/common/mass-actions/mass-actions-worker";
import { logger } from "@/server";

type ExportResult = {
	exportedCount: number;
	failedCount: number;
	filePath: string;
};

export const exportEntityItems = async (
	entity: string,
	searchMask: Record<string, any>,
	userEmail: string,
): Promise<ExportResult> => {
	try {
		logger.info(`[EXPORT] userEmail received: ${userEmail}`);

		const exportFilename = `${entity}_export_${Date.now()}.csv`;
		const exportPath = path.join("/tmp", exportFilename);
		const writeStream = fs.createWriteStream(exportPath);
		const csvStream = stringify({ header: true });
		csvStream.pipe(writeStream);

		let page = 1;
		let exportedCount = 0;

		while (true) {
			const pageItems = await fetchPage(entity, searchMask, page, 100, logger);
			if (pageItems.length === 0) break;

			for (const item of pageItems) {
				const attrs = item.attributes || item;
				const flat: Record<string, any> = {
					id: item.id,
					documentId: item.documentId,
				};

				for (const [key, value] of Object.entries(attrs)) {
					if (
						value &&
						typeof value === "object" &&
						Object.hasOwn(value, "data")
					) {
						const rel = (value as any).data;
						if (Array.isArray(rel)) {
							flat[key] = rel
								.map((r) => r.attributes?.name || "")
								.filter((n) => n)
								.join("; ");
						} else if (rel?.attributes?.name) {
							flat[key] = rel.attributes.name;
						} else {
							flat[key] = "";
						}
					} else {
						flat[key] = value;
					}
				}

				csvStream.write(flat);
			}

			exportedCount += pageItems.length;
			logger.info(
				`[EXPORT] processed page ${page}, total so far ${exportedCount}`,
			);
			page++;
		}

		csvStream.end();

		await new Promise<void>((resolve) => {
			writeStream.on("finish", () => resolve());
		});

		logger.info(`[EXPORT] CSV file saved: ${exportPath}`);

		await sendEmailWithAttachment(
			userEmail,
			"Your Exported Contacts – Nowtec Solutions AG",
			getEmailHTMLTemplate(),
			exportPath,
		);

		return {
			exportedCount,
			failedCount: 0,
			filePath: exportPath,
		};
	} catch (err: any) {
		logger.error(`[EXPORT] Can't export: ${err.message}`);
		throw err;
	}
};

const sendEmailWithAttachment = async (
	to: string,
	subject: string,
	html: string,
	filePath: string,
) => {
	const transporter = nodemailer.createTransport({
		host: env.DAL_SMTP_HOST,
		port: env.DAL_SMTP_PORT,
		secure: false,
		auth: {
			user: env.DAL_SMTP_USER,
			pass: env.DAL_SMTP_PASS,
		},
	});

	await transporter.sendMail({
		from: env.DAL_SMTP_FROM || env.DAL_SMTP_USER,
		to,
		subject,
		html,
		attachments: [
			{
				filename: path.basename(filePath),
				path: filePath,
			},
		],
	});

	logger.info(`[EXPORT] file sent to ${to}`);
};

const getEmailHTMLTemplate = (): string => {
	return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Exported Contacts</title>
    </head>
    <body style="font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #333;">
      <p style="font-size: 16px;">Hello,</p>
      <p style="font-size: 16px;">
        Please find the exported contact list attached to this email.
      </p>
      <p style="font-size: 16px;">
        You can open the attached file in any spreadsheet application (e.g., Excel, Google Sheets).
      </p>
      <p style="font-size: 16px;">
        If you have any questions or need assistance, feel free to contact us.
      </p>
      <p style="font-size: 16px;">
        Best regards,<br />
        <strong>Nowtec Solutions AG</strong>
      </p>
    </body>
  </html>
  `;
};
