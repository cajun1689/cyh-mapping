require('dotenv').config()
const nodemailer = require('nodemailer')
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses')

const region = process.env.AWS_REGION || 'us-west-2'
const sesClient = new SESClient({ region })

const createTransporter = () => {
  return nodemailer.createTransport({
    SES: {
      ses: sesClient,
      aws: { SendRawEmailCommand }
    }
  })
}

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter()
    const email = await transporter.sendMail(options)
    return email
  } catch (error) {
    console.error('sendEmail error:', error.message)
    return null
  }
}

module.exports = sendEmail
