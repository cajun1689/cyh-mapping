require('dotenv').config()
const nodemailer = require('nodemailer')

const createTransporter = async () => {
  try {
    
    const transporter = nodemailer.createTransport({
      service: 'Sendgrid',
      host: 'smtp.sendgrid.net',
      auth: {
        // Sendgrid default username. Do not change. Docs: https://devcenter.heroku.com/articles/sendgrid#api-keys
        user: 'apikey', 
        pass: process.env.SENDGRID_API_KEY
      }
    })

    return transporter

  } catch (error) {
    console.info(error)
    return   
  }
}

const sendEmail = async (options) => {
  try {
    let emailTransporter = await createTransporter()
    const email = await emailTransporter.sendMail(options)
    return email
  } catch (error) {
    console.info(error)
    return   
  }
}

/* ------------------------- SAMPLE USAGE ------------------ 

  const sampleOptions = {
    subject: "HT Test",
    text: "TEST",
    to: "amandarunion@gmail.com",
    from: process.env.OWNER_EMAIL
  }

  sendEmail(sampleOptions)
  
------------------------------------------------------------*/

module.exports =  sendEmail