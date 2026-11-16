# Letter Feature - Complete Integration Guide

## Setup Instructions
### Dependencies
```bash
cd apps/composer && npm install html-pdf@^3.0.1
cd apps/nowcrm-strapi && npm install mammoth@^1.6.0 pdf-parse@^1.1.1
```

### Database Migration
```bash
psql -U postgres -d nowcrm -f migration_letter_feature.sql
```

### Configuration
Add to `.env`:
```
LETTER_TEMPLATE_PATH=/templates
LETTER_MAX_FILE_SIZE=10485760
LETTER_ALLOWED_TYPES=docx,pdf
```

## User Manual
### Template Management
1. Upload DOCX/PDF template (max 10MB)
2. Add name and description
3. Validate and save

### Letter Creation
1. Select "Letter" channel in Composer
2. Choose template
3. Configure paper size/orientation
4. Add tokens: `{{first_name}}`, `{{last_name}}`, etc.
5. Preview and download PDF

### Batch Processing
1. Upload CSV with recipient data
2. Map columns to tokens
3. Process batch with progress tracking

## API Documentation
### Endpoints
```
POST /api/letter-templates/upload
- Upload template file
- Returns: {success, templateId, fileName}

POST /api/letters/generate
- Generate PDF with data
- Returns: {success, pdfUrl, fileName}

POST /api/letters/batch
- Process multiple recipients
- Returns: {success, processed, failed, results}
```

### Available Tokens
- `{{first_name}}`, `{{last_name}}`, `{{company}}`
- `{{address}}`, `{{email}}`, `{{date}}`
- `{{amount}}`, `{{invoice_number}}`

## Troubleshooting Guide
### Common Issues
1. **Template Upload Fails**: Check file type (DOCX/PDF) and size (<10MB)
2. **PDF Generation Fails**: Verify template HTML and token syntax
3. **Token Replacement Issues**: Ensure data keys match token names
4. **Batch Processing Slow**: Reduce batch size, increase concurrency

### Error Codes
- `LETTER_001`: Invalid template file
- `LETTER_002`: Template processing failed
- `LETTER_003`: PDF generation failed
- `LETTER_004`: Token replacement error
- `LETTER_005`: Batch processing error

### Logging
```bash
cd apps/composer && npm run dev
cd apps/nowcrm-strapi && npm run develop
```

## Deployment Checklist
### Pre-Deployment
- [ ] Dependencies installed
- [ ] Database migration executed
- [ ] Environment variables configured
- [ ] Template directory with write permissions
- [ ] Test templates uploaded

### Integration Testing
- [ ] Template upload test passed
- [ ] PDF generation test passed
- [ ] Token replacement test passed
- [ ] Batch processing test passed
- [ ] Frontend-backend integration verified

### Security
- [ ] File upload validation
- [ ] Template content sanitized
- [ ] Access controls configured
- [ ] Rate limiting enabled

### Performance
- [ ] Template caching enabled
- [ ] PDF generation optimized
- [ ] Batch queue configured
- [ ] Memory usage monitored

### Monitoring
- [ ] Error logging configured
- [ ] Performance metrics tracked
- [ ] Usage statistics collected
- [ ] Alerting for critical errors

## Support
1. Check application logs
2. Review API documentation
3. Contact development team

---

**Note**: Monitor system performance during high-volume usage.