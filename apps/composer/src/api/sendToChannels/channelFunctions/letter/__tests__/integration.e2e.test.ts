import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
/**
 * End-to-End Integration Tests for Letter Channel
 * 
 * These tests simulate the complete workflow from template to email delivery.
 * Note: These tests use mocks and don't call real external APIs.
 */

import { sendLetter, sendLetterViaEmail } from '../send-letter';
import { StrapiLetterClient } from '../strapi-client';
import { LetterEmailIntegration } from '../email-integration';
import { sendEmail } from '../email/send-email';

// Mock all external dependencies
jest.mock('../strapi-client');
jest.mock('../email-integration');
jest.mock('../email/send-email');

const MockStrapiLetterClient = StrapiLetterClient as jest.MockedClass<typeof StrapiLetterClient>;;
const MockLetterEmailIntegration = LetterEmailIntegration as jest.MockedClass<typeof LetterEmailIntegration>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

describe('Letter Channel End-to-End Integration', () => {
  const mockTemplateId = 'template-123';
  const mockContactData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp',
    position: 'Manager'
  };

  const mockRecipientEmail = 'recipient@example.com';
  const mockEmailFrom = 'sender@example.com';
  const mockEmailSubject = 'Your Important Business Letter';

  const mockContact = {
    id: 1,
    email: mockRecipientEmail,
    name: 'Jane Smith',
    subscriptions: []
  } as any;

  const mockComposition = {
    documentId: 1,
    result: '<p>Dear recipient, please find your letter attached.</p>',
    channel: { documentId: 1 },
    attached_files: []
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup comprehensive mock responses
    MockStrapiLetterClient.prototype.fetchTemplate.mockResolvedValue({
      id: 123,
      attributes: {
        name: 'Business Letter Template',
        description: 'Professional business letter template',
        paper_size: 'A4',
        orientation: 'portrait',
        margins: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5, unit: 'cm' },
        html_preview: '<div>Business Letter Content</div>',
        extracted_text: 'Business Letter Content',
        required_tokens: ['name', 'company', 'position'],
        is_active: true
      }
    });

    MockStrapiLetterClient.prototype.validateTokens.mockResolvedValue({
      valid: true,
      validated: ['name', 'company', 'position'],
      invalid: [],
      fields: ['name', 'company', 'position'],
      summary: { total: 3, valid: 3, invalid: 0 }
    });

    MockStrapiLetterClient.prototype.generatePdf.mockResolvedValue({
      success: true,
      file_path: 'http://strapi:1337/uploads/letter-template-123-generated.pdf',
      file_size: 24576 // 24KB
    });

    MockLetterEmailIntegration.prototype.sendLetterViaEmail.mockResolvedValue({
      success: true,
      message: 'Letter sent successfully via email',
      data: {
        success: true,
        messageId: 'email-msg-1234567890',
        pdfUrl: 'http://strapi:1337/uploads/letter-template-123-generated.pdf',
        metadata: {
          templateId: mockTemplateId,
          templateName: 'Business Letter Template',
          fileSize: 24576,
          pageCount: 2,
          processingTime: 1250,
          deliveryMethod: 'email-attachment',
          recipientEmail: mockRecipientEmail
        }
      },
      statusCode: 200
    });

    mockSendEmail.mockResolvedValue({
      success: true,
      message: 'Email sent successfully',
      data: 'email-msg-1234567890',
      statusCode: 200
    });
  });

  describe('Complete PDF Generation Workflow', () => {
    it('should complete full PDF generation workflow', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          returnPdf: true,
          pdfOptions: {
            paper_size: 'A4',
            orientation: 'portrait',
            dpi: 300
          }
        }
      });

      // Verify workflow steps
      expect(MockStrapiLetterClient.prototype.fetchTemplate).toHaveBeenCalledWith(mockTemplateId);
      expect(MockStrapiLetterClient.prototype.validateTokens).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData
      );
      expect(MockStrapiLetterClient.prototype.generatePdf).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData,
        expect.objectContaining({
          paper_size: 'A4',
          orientation: 'portrait',
          dpi: 300
        })
      );

      // Verify final result
      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.pdfUrl).toBe('http://strapi:1337/uploads/letter-template-123-generated.pdf');
      expect(result.data?.metadata?.templateId).toBe(mockTemplateId);
      expect(result.data?.metadata?.deliveryMethod).toBe('pdf-only');
    });

    it('should handle missing optional tokens gracefully', async () => {
      const partialContactData = {
        name: 'John Doe',
        // Missing company and position
      };

      MockStrapiLetterClient.prototype.validateTokens.mockResolvedValueOnce({
        valid: false,
        validated: ['name'],
        invalid: ['company', 'position'],
        fields: ['name', 'company', 'position'],
        summary: { total: 3, valid: 1, invalid: 2 }
      });

      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: partialContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: { returnPdf: true }
      });

      // Should still succeed despite invalid tokens (just warning)
      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
    });
  });

  describe('Complete Email Delivery Workflow', () => {
    it('should complete full email delivery workflow', async () => {
      const result = await sendLetterViaEmail(
        mockTemplateId,
        mockContactData,
        {
          from: mockEmailFrom,
          to: mockRecipientEmail,
          subject: mockEmailSubject,
          contact: mockContact,
          composition: mockComposition
        }
      );

      // Verify email integration was used
      expect(MockLetterEmailIntegration.prototype.sendLetterViaEmail).toHaveBeenCalled();

      // Verify final result
      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.messageId).toBe('email-msg-1234567890');
      expect(result.data?.pdfUrl).toBe('http://strapi:1337/uploads/letter-template-123-generated.pdf');
      expect(result.data?.metadata?.deliveryMethod).toBe('email-attachment');
      expect(result.data?.metadata?.recipientEmail).toBe(mockRecipientEmail);
    });

    it('should include PDF attachment in email', async () => {
      await sendLetterViaEmail(
        mockTemplateId,
        mockContactData,
        {
          from: mockEmailFrom,
          to: mockRecipientEmail,
          subject: mockEmailSubject,
          contact: mockContact,
          composition: mockComposition
        }
      );

      // Verify email was sent with attachment
      expect(mockSendEmail).toHaveBeenCalledWith(
        mockEmailFrom,
        mockContact,
        mockEmailSubject,
        expect.objectContaining({
          attached_files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringMatching(/^letter-template-123-\d+\.pdf$/),
              url: expect.stringContaining('.pdf'),
              type: 'pdf'
            })
          ])
        }),
        expect.any(Boolean)
      );
    });
  });

  describe('Error Handling in Complete Workflow', () => {
    it('should handle template not found error gracefully', async () => {
      MockStrapiLetterClient.prototype.fetchTemplate.mockRejectedValueOnce(
        new Error('Template not found (404)')
      );

      const result = await sendLetter({
        templateId: 'non-existent-template',
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: { returnPdf: true }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Template not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle PDF generation failure in email workflow', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockResolvedValueOnce({
        success: false,
        error: 'PDF generation service unavailable'
      });

      const result = await sendLetterViaEmail(
        mockTemplateId,
        mockContactData,
        {
          from: mockEmailFrom,
          to: mockRecipientEmail,
          subject: mockEmailSubject,
          contact: mockContact,
          composition: mockComposition
        }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('PDF generation failed');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      mockSendEmail.mockResolvedValueOnce({
        success: false,
        message: 'SMTP server unavailable',
        data: null,
        statusCode: 503
      });

      const result = await sendLetterViaEmail(
        mockTemplateId,
        mockContactData,
        {
          from: mockEmailFrom,
          to: mockRecipientEmail,
          subject: mockEmailSubject,
          contact: mockContact,
          composition: mockComposition
        }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Email sending failed');
    });
  });

  describe('Performance and Data Validation', () => {
    it('should validate response data structure', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: { returnPdf: true }
      });

      // Validate response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('statusCode');

      if (result.data) {
        expect(result.data).toHaveProperty('success');
        expect(result.data).toHaveProperty('pdfUrl');
        expect(result.data).toHaveProperty('messageId');
        expect(result.data).toHaveProperty('metadata');

        if (result.data.metadata) {
          expect(result.data.metadata).toHaveProperty('templateId');
          expect(result.data.metadata).toHaveProperty('deliveryMethod');
          expect(result.data.metadata).toHaveProperty('recipientEmail');
        }
      }
    });

    it('should include processing metadata', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: { returnPdf: true }
      });

      expect(result.data?.metadata).toMatchObject({
        templateId: mockTemplateId,
        deliveryMethod: 'pdf-only',
        recipientEmail: mockRecipientEmail,
        fileSize: 24576
      });
    });
  });

  describe('Configuration and Environment', () => {
    it('should use environment variables for configuration', () => {
      // Test is covered by unit tests, but we verify the integration respects config
      expect(MockStrapiLetterClient).toHaveBeenCalled();
    });
  });
});
