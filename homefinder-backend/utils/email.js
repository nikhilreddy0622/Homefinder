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

// Send email
const sendEmail = async (options) => {
  try {
    console.log('=== EMAIL SENDING ATTEMPT ===');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('HTML length:', options.html ? options.html.length : 0);
    
    // Create transporter with environment-based configuration
    let transporterConfig = {};
    
    // Check if we're using SMTP or Gmail
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      // Custom SMTP configuration
      transporterConfig = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Set to true in production with proper certificates
        }
      };
    } else {
      // Default to Gmail configuration
      transporterConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER || 'rentifyyourhome@gmail.com',
          pass: process.env.EMAIL_PASS || 'qmnmauzjbwmbfyjc'
        },
        tls: {
          rejectUnauthorized: false
        }
      };
    }

    // Add timeout configuration to prevent hanging connections
    transporterConfig.pool = true;
    transporterConfig.rateDelta = 10000; // 10 seconds
    transporterConfig.rateLimit = 5; // Max 5 messages per rateDelta
    
    const transporter = nodemailer.createTransport(transporterConfig);

    // Define email options
    const message = {
      from: process.env.FROM_EMAIL || `Homefinder <rentifyyourhome@gmail.com>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    // Send email with timeout
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
    // More specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Check your credentials.');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Email connection refused. Check your SMTP settings.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Email connection timed out. Check your network connection or firewall settings.');
    } else if (error.message.includes('timed out')) {
      throw new Error('Email sending timed out. The email server may be slow or unreachable.');
    }
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
  loadTemplate
};
