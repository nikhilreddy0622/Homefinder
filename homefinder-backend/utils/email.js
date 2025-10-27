const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load email template
const loadTemplate = (templateName, variables = {}) => {
  try {
    const templatePath = path.join(__dirname, '..', 'emails', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, variables[key]);
    });
    
    return template;
  } catch (error) {
    console.error('Error loading email template:', error);
    throw new Error('Could not load email template');
  }
};

// Send email with proper configuration based on environment variables
const sendEmail = async (options) => {
  try {
    console.log('=== EMAIL SENDING ATTEMPT ===');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('HTML length:', options.html ? options.html.length : 0);
    
    // Skip email sending in test environments
    if (process.env.NODE_ENV === 'test') {
      console.log('Skipping email sending in test environment');
      return { messageId: 'test-message-id' };
    }
    
    // If SENDGRID_API_KEY is set, use SendGrid API directly
    if (process.env.SENDGRID_API_KEY) {
      console.log('Using SendGrid API for email delivery');
      return await sendEmailWithSendGrid(options);
    }
    
    // If MAILGUN_API_KEY is set, use Mailgun API directly
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      console.log('Using Mailgun API for email delivery');
      return await sendEmailWithMailgun(options);
    }
    
    // Create transporter - use Gmail service configuration (similar to working laundry app)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL || process.env.EMAIL_USER || 'rentifyyourhome@gmail.com',
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || 'qmnmauzjbwmbfyjc'
      }
    });

    // Define email options
    const message = {
      from: process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || 'Homefinder <rentifyyourhome@gmail.com>',
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    // Send email with timeout
    console.log('Attempting to send email with Gmail service configuration');
    
    const info = await Promise.race([
      transporter.sendMail(message),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email sending timed out')), 15000)
      )
    ]);
    
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error stack:', error.stack);
    
    // More specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check your credentials.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Email connection refused. Check your SMTP settings.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Email connection timed out. This is common on cloud platforms that block SMTP. Consider using a transactional email service like SendGrid or Mailgun.');
    } else if (error.message.includes('timed out')) {
      throw new Error('Email sending timed out. This is common on cloud platforms that block SMTP. Consider using a transactional email service like SendGrid or Mailgun.');
    }
    
    // Log additional error details for debugging
    if (error.response) {
      console.error('Email server response:', error.response);
    }
    if (error.responseCode) {
      console.error('Email server response code:', error.responseCode);
    }
    
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

// Send email using SendGrid API
const sendEmailWithSendGrid = async (options) => {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: options.email,
    from: process.env.FROM_EMAIL || 'rentifyyourhome@gmail.com',
    subject: options.subject,
    html: options.html,
  };
  
  try {
    await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid');
    return { messageId: 'sendgrid-message-id' };
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
    }
    throw new Error(`SendGrid email could not be sent: ${error.message}`);
  }
};

// Send email using Mailgun API
const sendEmailWithMailgun = async (options) => {
  const formData = require('form-data');
  const Mailgun = require('mailgun.js');
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    url: process.env.MAILGUN_URL || 'https://api.mailgun.net'
  });
  
  const data = {
    from: process.env.FROM_EMAIL || 'rentifyyourhome@gmail.com',
    to: options.email,
    subject: options.subject,
    html: options.html,
  };
  
  try {
    const body = await mg.messages.create(process.env.MAILGUN_DOMAIN, data);
    console.log('Email sent successfully via Mailgun:', body.id);
    return { messageId: body.id };
  } catch (error) {
    console.error('Mailgun error:', error);
    throw new Error(`Mailgun email could not be sent: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
  loadTemplate
};
