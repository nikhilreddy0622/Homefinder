const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '..', 'config', 'config.env') });

// Gmail OAuth2 configuration (primary service)
let oauth2Client = null;
let transporter = null;

// Check if Gmail credentials are available and configure Gmail service
if (process.env.GMAIL_EMAIL && process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
  try {
    oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || "https://developers.google.com/oauthplayground"
    );
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
    
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });
    
    console.log('Gmail OAuth2 email service configured as primary');
  } catch (error) {
    console.error('Failed to configure Gmail OAuth2:', error.message);
  }
} else {
  console.log('Gmail OAuth2 credentials not found in environment variables');
}

// Load email template
const loadTemplate = (templateName, variables = {}) => {
  try {
    const templatePath = path.join(__dirname, '..', 'emails', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace variables in template with sanitized values to prevent injection
    Object.keys(variables).forEach(key => {
      // Sanitize variable values to prevent template injection
      let sanitizedValue = variables[key];
      if (typeof sanitizedValue === 'string') {
        // Escape HTML special characters
        sanitizedValue = sanitizedValue
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      }
      
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, sanitizedValue);
    });
    
    return template;
  } catch (error) {
    console.error('Error loading email template:', error);
    throw new Error('Could not load email template');
  }
};

// Send email using Gmail OAuth2 (primary service)
const sendEmail = async (options) => {
  console.log('=== EMAIL SENDING ATTEMPT ===');
  console.log('To:', options.email);
  console.log('Subject:', options.subject);
  console.log('HTML length:', options.html ? options.html.length : 0);
  
  // Skip email sending in test environments
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping email sending in test environment');
    return { success: true, messageId: 'test-message-id' };
  }
  
  // If Gmail is configured, use it
  if (oauth2Client) {
    try {
      // Get fresh access token
      const accessToken = await oauth2Client.getAccessToken();
      
      // Create fresh transporter with access token (matching gmail-api-master pattern)
      const freshTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.GMAIL_EMAIL,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken.token || accessToken,
        },
      });
      
      const mailOptions = {
        from: `Homefinder <${process.env.GMAIL_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.html || '<p>No content provided</p>',
      };
      
      const info = await freshTransporter.sendMail(mailOptions);
      console.log('Email sent successfully via Gmail:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('=== GMAIL SENDING ERROR DETAILS ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Log additional error details if available
      if (error.response) {
        console.error('Error response:', error.response);
      }
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.command) {
        console.error('Error command:', error.command);
      }
      
      // Check for token revoked errors
      if (error.message && (error.message.includes('invalid_grant') || error.message.includes('Token has been revoked'))) {
        console.error('OAuth token has been revoked. Please ensure proper OAuth setup with access_type=offline');
        return { 
          success: false, 
          error: 'OAuth token has been revoked. Please ensure proper OAuth setup with access_type=offline',
          errorCode: 'TOKEN_REVOKED',
          errorDetails: {
            name: error.name,
            message: error.message,
            code: error.code
          }
        };
      }
      
      // Check for deleted client errors
      if (error.message && (error.message.includes('deleted_client') || error.code === 401)) {
        console.error('OAuth client has been deleted or deactivated. Please recreate the OAuth credentials in Google Cloud Console.');
        return { 
          success: false, 
          error: 'The email service is currently unavailable due to invalid credentials. Please contact support to resolve this issue.',
          errorCode: 'DELETED_CLIENT',
          errorDetails: {
            name: error.name,
            message: error.message,
            code: error.code
          }
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        errorCode: error.name,
        errorDetails: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      };
    }
  }
  
  // If no email service is configured, fall back to console logging
  console.log('No email service configured, logging email content instead');
  console.log('Email content:', options.html);
  return { 
    success: true, 
    messageId: 'no-email-service-configured',
    warning: 'Email service not configured - using development fallback'
  };
};

module.exports = {
  sendEmail,
  loadTemplate
};
