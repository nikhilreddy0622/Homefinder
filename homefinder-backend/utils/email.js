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
    
    // Create transporter with direct credentials
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'rentifyyourhome@gmail.com',
        pass: 'qmnmauzjbwmbfyjc'
      }
    });

    // Define email options
    const message = {
      from: `Homefinder <rentifyyourhome@gmail.com>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    // Send email
    const info = await transporter.sendMail(message);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

module.exports = {
  sendEmail,
  loadTemplate
};