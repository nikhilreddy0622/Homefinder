const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Simple transporter configuration like laundry app
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'rentifyyourhome@gmail.com',
        pass: process.env.EMAIL_PASS || 'qmnmauzjbwmbfyjc'
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
  
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'Homefinder <rentifyyourhome@gmail.com>',
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  // Send mail with retry logic (same approach as laundry app)
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    const sendAttempt = () => {
      attempts++;
      console.log(`Email sending attempt ${attempts}/${maxAttempts}`);
      
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.error(`Email sending failed (attempt ${attempts}):`, error);
          
          // Retry if we haven't exceeded max attempts
          if (attempts < maxAttempts && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
            console.log(`Retrying email send in ${attempts * 1000}ms...`);
            setTimeout(sendAttempt, attempts * 1000); // Exponential backoff
          } else {
            resolve({ success: false, error: error.message });
          }
        } else {
          console.log('Email sent successfully: ' + info.response);
          resolve({ success: true, messageId: info.messageId });
        }
      });
    };
    
    sendAttempt();
  });
};

module.exports = {
  sendEmail,
  loadTemplate
};
