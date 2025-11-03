import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class TwoFactorAuth {
  // Generate a secret key for a user
  static generateSecret(email) {
    return speakeasy.generateSecret({
      name: `Library Management (${email})`,
      issuer: 'Richfield Library'
    });
  }

  // Generate QR code URL for the secret
  static async generateQRCode(secret) {
    try {
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      return qrCodeUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify the TOTP code
  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Allows 1 step (30 seconds) before/after current time
    });
  }

  // Generate a backup code (simple implementation)
  static generateBackupCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

export default TwoFactorAuth;