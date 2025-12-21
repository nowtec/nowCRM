import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { sendLetter, generateLetterPdf, sendLetterViaEmail } from '../send-letter';
import { StrapiLetterClient } from '../strapi-client';
import { LetterEmailIntegration } from '../email-integration';

// Mock dependencies
jest.mock('../strapi-client');
jest.mock('../email-integration');

const MockStrapiLetterClient = StrapiLetterClient as jest.MockedClass<typeof StrapiLetterClient>;
const MockLetterEmailIntegration = LetterEmailIntegration as jest.MockedClass<typeof LetterEmailIntegration>;

describe('sendLetter', () => {
  const mockTemplateId = '123';
  const mockContactData = { name: 'John Doe', email: 'john@example.com' };
  const mockRecipientEmail = 'recipient@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    MockStrapiLetterClient.prototype.fetchTemplate.mockResolvedValue({
      id: 123,
      attributes: {
        name: 'Test Letter Template',
        description: 'A test template',
        paper_size: 'A4',
        orientation: 'portrait',
        is_active: true
      }
    });

    MockStrapiLetterClient.prototype.generatePdf.mockResolvedValue({
      success: true,
      file_path: '/uploads/letter-123.pdf',
      file_size: 1024
    });

    MockStrapiLetterClient.prototype.validateTokens.mockResolvedValue({
      valid: true,
      validated: ['name', 'email'],
      invalid: [],
      fields: ['name', 'email'],
      summary: { total: 2, valid: 2, invalid: 0 }
    });

    MockLetterEmailIntegration.prototype.sendLetterViaEmail.mockResolvedValue({
      success: true,
      message: 'Letter sent successfully via email',
      data: {
        success: true,
        messageId: 'email-123456',
        pdfUrl: '/uploads/letter-123.pdf',
        metadata: {
          templateId: '123',
          deliveryMethod: 'email-attachment',
          recipientEmail: mockRecipientEmail
        }
      },
      statusCode: 200
    });
  });

  describe('basic functionality', () => {
    it('should send letter successfully with PDF generation', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          returnPdf: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.pdfUrl).toBe('/uploads/letter-123.pdf');
      expect(result.data?.metadata?.deliveryMethod).toBe('pdf-only');
      
      expect(MockStrapiLetterClient.prototype.fetchTemplate).toHaveBeenCalledWith(mockTemplateId);
      expect(MockStrapiLetterClient.prototype.generatePdf).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData,
        undefined
      );
    });

    it('should validate tokens when contact data is provided', async () => {
      await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail
      });

      expect(MockStrapiLetterClient.prototype.validateTokens).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData
      );
    });

    it('should handle PDF generation options', async () => {
      const pdfOptions = {
        paper_size: 'A4' as const,
        orientation: 'portrait' as const,
        dpi: 300
      };

      await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          pdfOptions,
          returnPdf: true
        }
      });

      expect(MockStrapiLetterClient.prototype.generatePdf).toHaveBeenCalledWith(
        mockTemplateId,
        mockContactData,
        pdfOptions
      );
    });
  });

  describe('error handling', () => {
    it('should return error when templateId is missing', async () => {
      const result = await sendLetter({
        templateId: '',
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Template ID is required');
      expect(result.statusCode).toBe(400);
    });

    it('should return error when recipientEmail is missing', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: ''
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Recipient email is required');
      expect(result.statusCode).toBe(400);
    });

    it('should handle template not found error', async () => {
      MockStrapiLetterClient.prototype.fetchTemplate.mockRejectedValueOnce(
        new Error('Template not found')
      );

      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Template not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle PDF generation failure', async () => {
      MockStrapiLetterClient.prototype.generatePdf.mockResolvedValueOnce({
        success: false,
        error: 'PDF generation failed'
      });

      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('PDF generation failed');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('email integration', () => {
    const mockEmailOptions = {
      from: 'sender@example.com',
      subject: 'Your Important Letter',
      contact: {
        id: 1,
        email: mockRecipientEmail,
        name: 'John Doe',
        subscriptions: []
      } as any,
      composition: {
        documentId: 1,
        result: '<p>Email body</p>',
        channel: { documentId: 1 },
        attached_files: []
      } as any,
      ignoreSubscription: false
    };

    it('should send letter via email when sendViaEmail is true', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          sendViaEmail: true,
          emailOptions: mockEmailOptions
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.messageId).toBe('email-123456');
      expect(result.data?.metadata?.deliveryMethod).toBe('email-attachment');
      
      expect(MockLetterEmailIntegration.prototype.sendLetterViaEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: mockTemplateId,
          contactData: mockContactData,
          recipientEmail: mockRecipientEmail
        }),
        mockEmailOptions.from,
        mockEmailOptions.subject,
        mockEmailOptions.contact,
        mockEmailOptions.composition,
        mockEmailOptions.ignoreSubscription
      );
    });

    it('should return error when email options are incomplete', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          sendViaEmail: true,
          emailOptions: {
            from: 'sender@example.com',
            subject: 'Test',
            // Missing contact and composition
          } as any
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required email options');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('helper functions', () => {
    it('generateLetterPdf should call sendLetter with returnPdf: true', async () => {
      const result = await generateLetterPdf(mockTemplateId, mockContactData);

      expect(result.success).toBe(true);
      expect(result.data?.pdfUrl).toBeDefined();
      expect(result.data?.metadata?.deliveryMethod).toBe('pdf-only');
    });

    it('sendLetterViaEmail should call sendLetter with sendViaEmail: true', async () => {
      const mockEmailOptions = {
        from: 'sender@example.com',
        to: mockRecipientEmail,
        subject: 'Test Letter',
        contact: {} as any,
        composition: {} as any
      };

      const result = await sendLetterViaEmail(
        mockTemplateId,
        mockContactData,
        mockEmailOptions
      );

      expect(result.success).toBe(true);
      expect(MockLetterEmailIntegration.prototype.sendLetterViaEmail).toHaveBeenCalled();
    });
  });

  describe('response structure', () => {
    it('should return correct response structure for PDF-only', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: { returnPdf: true }
      });

      expect(result.data).toMatchObject({
        success: true,
        pdfUrl: expect.any(String),
        messageId: expect.any(String),
        metadata: expect.objectContaining({
          templateId: mockTemplateId,
          deliveryMethod: 'pdf-only',
          recipientEmail: mockRecipientEmail
        })
      });
    });

    it('should return correct response structure for email delivery', async () => {
      const result = await sendLetter({
        templateId: mockTemplateId,
        contactData: mockContactData,
        recipientEmail: mockRecipientEmail,
        additionalOptions: {
          sendViaEmail: true,
          emailOptions: {
            from: 'sender@example.com',
            subject: 'Test',
            contact: {} as any,
            composition: {} as any
          }
        }
      });

      expect(result.data).toMatchObject({
        success: true,
        messageId: expect.any(String),
        pdfUrl: expect.any(String),
        metadata: expect.objectContaining({
          deliveryMethod: 'email-attachment'
        })
      });
    });
  });
});
