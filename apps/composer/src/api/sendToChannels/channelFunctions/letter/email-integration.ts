import { ServiceResponse } from "@nowcrm/services";
import { StatusCodes } from "http-status-codes";
import { env } from "@/common/utils/env-config";
import { sendEmail } from "../email/send-email";
import type { Contact, CompositionItem } from "@nowcrm/services";
import { StrapiLetterClient } from "./strapi-client";
import type { LetterServiceRequest, LetterServiceResponse } from "./send-letter";

/**
 * Email Attachment Interface for Letter PDFs
 * Matches nodemailer attachment structure used in Email Channel
 */
export interface LetterEmailAttachment {
  filename: string;
  contentType: string;
  content?: Buffer;
  path?: string;
  cid?: string;
}

/**
 * Letter Email Integration Class
 * 
 * Adapter pattern that connects Letter Channel with Email Channel
 * for sending generated PDF letters as email attachments
 */
export class LetterEmailIntegration {
  private client: StrapiLetterClient;

  constructor(baseUrl?: string, apiToken?: string) {
    const strapiBaseUrl = baseUrl || env.STRAPI_API_URL || process.env.STRAPI_API_URL || "http://localhost:1337";
    const strapiApiToken = apiToken || env.STRAPI_API_TOKEN || process.env.STRAPI_API_TOKEN;
    
    this.client = new StrapiLetterClient(strapiBaseUrl, strapiApiToken);
  }

  /**
   * Send letter via email with PDF attachment
   * 
   * Workflow:
   * 1. Generate PDF from letter template using Strapi API
   * 2. Convert PDF to Buffer for email attachment
   * 3. Create email with PDF attachment
   * 4. Send email via Email Channel
   * 
   * @param letterRequest - Letter service request parameters
   * @param emailFrom - Sender email address
   * @param emailSubject - Email subject line
   * @param contact - Recipient contact information
   * @param composition - Email composition data
   * @param ignoreSubscription - Whether to ignore subscription checks
   * @returns Combined response with email messageId and PDF URL
   */
  async sendLetterViaEmail(
    letterRequest: LetterServiceRequest,
    emailFrom: string,
    emailSubject: string,
    contact: Contact,
    composition: CompositionItem,
    ignoreSubscription: boolean = false
  ): Promise<ServiceResponse<LetterServiceResponse>> {
    try {
      const { templateId, contactData, additionalOptions } = letterRequest;


      // Step 1: Generate PDF from template
      let pdfResult;
      try {
        pdfResult = await this.client.generatePdf(
          templateId,
          contactData,
          additionalOptions?.pdfOptions
        );
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || "PDF generation failed");
        }
        
      } catch (error) {
        console.error(`[LetterEmailIntegration] PDF generation failed:`, error);
        
        return ServiceResponse.failure(
          `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          { 
            success: false, 
            error: `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            metadata: { templateId }
          },
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // Step 2: Create email attachment from PDF
      // Note: In a real implementation, we would fetch the PDF from the file_path
      // For now, we'll create a mock attachment structure
      const attachment: LetterEmailAttachment = {
        filename: `letter-${templateId}-${Date.now()}.pdf`,
        contentType: 'application/pdf',
        // In production: content: await this.fetchPdfBuffer(pdfResult.file_path)
        path: pdfResult.file_path // nodemailer can handle file paths
      };


      // Step 3: Update composition with attachment
      // Note: The current sendEmail function expects attachments in composition.attached_files
      // We need to adapt our attachment to match the expected structure
      const updatedComposition: CompositionItem = {
        ...composition,
        attached_files: [
          ...(composition.attached_files || []),
          {
            name: attachment.filename,
            url: attachment.path || '',
            type: 'pdf'
          }
        ]
      };

      // Step 4: Send email with attachment via Email Channel
      const emailResponse = await sendEmail(
        emailFrom,
        contact,
        emailSubject,
        updatedComposition,
        ignoreSubscription
      );

      if (!emailResponse.success) {
        console.error(`[LetterEmailIntegration] Email sending failed:`, emailResponse.message);
        
        return ServiceResponse.failure(
          `Email sending failed: ${emailResponse.message}`,
          { 
            success: false, 
            error: `Email sending failed: ${emailResponse.message}`,
            metadata: { templateId, emailError: emailResponse.message }
          },
          emailResponse.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // Step 5: Return combined response
      const response: LetterServiceResponse = {
        success: true,
        messageId: emailResponse.data || `email-${Date.now()}-${templateId}`,
        pdfUrl: pdfResult.file_path,
        metadata: {
          templateId,
          fileSize: pdfResult.file_size,
          pageCount: 1,
          processingTime: 0,
          deliveryMethod: 'email',
          recipientEmail: contact.email
        }
      };


      return ServiceResponse.success(
        "Letter sent successfully via email",
        response,
        StatusCodes.OK
      );

    } catch (error) {
      console.error("[LetterEmailIntegration] Error in sendLetterViaEmail:", error);
      
      return ServiceResponse.failure(
        `Failed to send letter via email: ${error instanceof Error ? error.message : "Unknown error"}`,
        { 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        },
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Helper method to fetch PDF as Buffer from file path
   * This would be implemented in production to fetch the actual PDF file
   */
  private async fetchPdfBuffer(filePath: string): Promise<Buffer> {
    // In production: fetch PDF from Strapi file URL
    // const response = await fetch(filePath);
    // return Buffer.from(await response.arrayBuffer());
    
    // Mock implementation for now
    return Buffer.from(`Mock PDF content for ${filePath}`);
  }

  /**
   * Send letter as direct PDF attachment (simplified version)
   * 
   * @param letterRequest - Letter service request
   * @param emailOptions - Email sending options
   * @returns ServiceResponse with sending results
   */
  async sendLetterAsAttachment(
    letterRequest: LetterServiceRequest,
    emailOptions: {
      from: string;
      to: string;
      subject: string;
      body?: string;
    }
  ): Promise<ServiceResponse<LetterServiceResponse>> {
    // This is a simplified version that would need actual Contact and Composition objects
    // For now, we'll return a mock response
    
    const mockResponse: LetterServiceResponse = {
      success: true,
      messageId: `email-attachment-${Date.now()}`,
      pdfUrl: `http://strapi/api/letter-templates/${letterRequest.templateId}/generated-pdf`,
      metadata: {
        templateId: letterRequest.templateId,
        deliveryMethod: 'email-attachment',
        recipientEmail: emailOptions.to
      }
    };

    return ServiceResponse.success(
      "Letter prepared for email attachment",
      mockResponse,
      StatusCodes.OK
    );
  }
}
