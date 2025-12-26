export const passwordResetSubject = (appName: string) => `Password Reset OTP for ${appName}`;

export const passwordResetTemplate = (appName: string, otp: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password for ${appName}. Use the OTP below to reset your password:</p>
    
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
      ${otp}
    </div>
    
    <p>This OTP will expire in 15 minutes.</p>
    
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    
    <p>Best regards,<br>The ${appName} Team</p>
  </div>
`;
