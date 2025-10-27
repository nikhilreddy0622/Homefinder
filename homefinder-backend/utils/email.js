const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Simple transporter configuration (same as laundry app)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || 'rentifyyourhome@gmail.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || 'qmnmauzjbwmbfyjc'
    }
});

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

// Send email (simplified approach like laundry app)
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
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'Homefinder <rentifyyourhome@gmail.com>',
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  // Send mail (same approach as laundry app)
  return new Promise((resolve) => {
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.error('Email sending failed:', error);
        resolve({ success: false, error: error.message });
      } else {
        console.log('Email sent successfully: ' + info.response);
        resolve({ success: true, messageId: info.messageId });
      }
    });
  });
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
    return { success: true, messageId: 'sendgrid-message-id' };
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid response body:', error.response.body);
    }
    return { success: false, error: `SendGrid email could not be sent: ${error.message}` };
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
    return { success: true, messageId: body.id };
  } catch (error) {
    console.error('Mailgun error:', error);
    return { success: false, error: `Mailgun email could not be sent: ${error.message}` };
  }
};

module.exports = {
  sendEmail,
  loadTemplate
};
