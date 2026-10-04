import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { LetterEmailIntegration } from '../email-integration';
import { StrapiLetterClient } from '../strapi-client';
import { sendEmail } from '../email/send-email';

// Mock dependencies
jest.mock('../strapi-client');
jest.mock('../email/send-email');

const MockStrapiLetterClient = StrapiLetterClient as jest.MockedClass<typeof StrapiLetterClient>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

describe('LetterEmailIntegration', () => {
  let integration: LetterEmailIntegration;
  const mockBaseUrl = 'http://localhost:1337';
  const mockApiToken = 'test-token-123';

  const mockTemplateId = '123';
  const mockContactData = { name: 'John Doe', email: 'john@example.com' };
  const mockRecipientEmail = 'recipient@example.com';
  
  const mockLetterRequest = {
    templateId: mockTemplateId,
    contactData: mockContactData,
    recipientEmail: mockRecipientEmail,
    additionalOptions: {
      pdfOptions: {
        paper_size: 'A4' as const,
        orientation: 'portrait' as const
      }
    }
  };

  const mockEmailFrom = 'sender@example.com';
  const mockEmailSubject = 'Your Important Letter';
  const mockContact = {
    id: 1,
    email: mockRecipientEmail,
    name: 'John Doe',
    subscriptions: []
  } as any;

  const mockComposition = {
    documentId: 1,
    result: '<p>Please find your letter attached.</p>',
    channel: { documentId: 1 },
    attached_files: []
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    integration = new LetterEmailIntegration(mockBaseUrl, mockApiToken);

    // Setup default mock implementations
    MockStrapiLetterClient.prototype.generatePdf.mockResolvedValue({
      success: true,
      file_path: '/uploads/letter-123.pdf',
      file_size: 1024
    });

    mockSendEmail.mockResolvedValue({
      success: true,
      message: 'Email sent successfully',
      data: 'email-message-id-123',
      statusCode: 200
    });
  });

  describe('constructor', () => {
    it('should create integration with Strapi client', () => {
      expect(integration).toBeInstanceOf(LetterEmailIntegration);
      expect(MockStrapiLetterClient).toHaveBeenCalledWith(mockBaseUrl, mockApiToken);
    });

    it('should use environment variables when no parameters provided', () => {
      // Temporarily set environment variables
      const originalEnv = process.env;
      process.env.STRAPI_API_URL = 'http://strapi:1337';
      process.env.STRAPI_API_TOKEN = 'env-token';

      const envIntegration = new LetterEmailIntegration();
      
      expect(MockStrapiLetterClient).toHaveBeenCalledWith(
        'http://strapi:1337',
        'env-token'
      );

      process.env = originalEnv;
    });
  });

  describe('sendLetterViaEmail', () => {
    it('should send letter via email successfully', async () => {
      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.messageId).toBe('email-message-id-123');
      expect(result.data?.pdfUrl).toBe('/uploads/letter-123.pdf');
      expect(result.data?.metadata?.deliveryMethod).toBe('email');

      // Verify PDF generation was called
      expect(MockStrapiLetterClient.prototype.generatePdf).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData,
        mockLetterRequest.additionalOptions?.pdfOptions
      );

      // Verify email was sent with updated composition
      expect(mockSendEmail).toHaveBeenCalledWith(
        mockEmailFrom,
        mockContact,
        mockEmailSubject,
        expect.objectContaining({
          attached_files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('letter-123-'),
              url: '/uploads/letter-123.pdf',
              type: 'pdf'
            })
          ])
        }),
        false
      );
    });

    it('should handle PDF generation failure', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockResolvedValueOnce({
        success: false,
        error: 'PDF generation failed'
      });

      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('PDF generation failed');
      expect(result.statusCode).toBe(500);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      mockSendEmail.mockResolvedValueOnce({
        success: false,
        message: 'Email sending failed',
        data: null,
        statusCode: 500
      });

      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Email sending failed');
      expect(result.statusCode).toBe(500);
    });

    it('should include PDF in attachment filename', async () => {
      await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          attached_files: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringMatching(/^letter-123-\d+\.pdf$/),
              type: 'pdf'
            })
          ])
        }),
        expect.any(Boolean)
      );
    });

    it('should preserve existing attachments in composition', async () => {
      const compositionWithAttachments = {
        ...mockComposition,
        attached_files: [
          { name: 'existing.pdf', url: '/uploads/existing.pdf', type: 'pdf' }
        ]
      };

      await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        compositionWithAttachments,
        false
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          attached_files: expect.arrayContaining([
            expect.objectContaining({ name: 'existing.pdf' }),
            expect.objectContaining({ name: expect.stringContaining('letter-123-') })
          ])
        }),
        expect.any(Boolean)
      );
    });
  });

  describe('sendLetterAsAttachment', () => {
    it('should prepare letter for email attachment', async () => {
      const emailOptions = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Letter'
      };

      const result = await integration.sendLetterAsAttachment(
        mockLetterRequest,
        emailOptions
      );

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.messageId).toContain('email-attachment-');
      expect(result.data?.pdfUrl).toContain('http://strapi/api/letter-templates/123/generated-pdf');
      expect(result.data?.metadata?.deliveryMethod).toBe('email-attachment');
    });
  });

  describe('error handling', () => {
    it('should handle Strapi API errors', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockRejectedValueOnce(
        new Error('Strapi API error')
      );

      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send letter via email');
      expect(result.statusCode).toBe(500);
    });

    it('should handle network errors during PDF generation', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send letter via email');
    });
  });

  describe('response structure', () => {
    it('should return correct response structure', async () => {
      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.data).toMatchObject({
        success: true,
        messageId: expect.any(String),
        pdfUrl: expect.any(String),
        metadata: expect.objectContaining({
          templateId: mockTemplateId,
          deliveryMethod: 'email',
          recipientEmail: mockRecipientEmail
        })
      });
    });

    it('should include file size in metadata when available', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockResolvedValueOnce({
        success: true,
        file_path: '/uploads/letter-123.pdf',
        file_size: 2048
      });

      const result = await integration.sendLetterViaEmail(
        mockLetterRequest,
        mockEmailFrom,
        mockEmailSubject,
        mockContact,
        mockComposition,
        false
      );

      expect(result.data?.metadata?.fileSize).toBe(2048);
    });
  });
});
