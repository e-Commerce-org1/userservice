export const verificationEmailSubject = (appName: string) => `Verify Your Email for ${appName}`;

export const verificationEmailTemplate = (appName: string, token: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Welcome to ${appName}!</h2>
    <p>Thank you for signing up. To complete your registration, please verify your email address using the verification code below:</p>
    
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
      ${token}
    </div>
    
    <p>The verification code will expire in 1 hour.</p>
    
    <p>If you didn't create an account on ${appName}, you can safely ignore this email.</p>
    
    <p>Best regards,<br>The ${appName} Team</p>
  </div>
`;
