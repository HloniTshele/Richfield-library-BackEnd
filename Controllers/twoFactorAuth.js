import TwoFactorAuth from '../utils/twoFactorAuth.js';

// Enable 2FA - Step 1: Generate secret and QR code
const enable2FA = async (req, res, db) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate secret
    const secret = TwoFactorAuth.generateSecret(email);
    
    // Generate QR code
    const qrCodeUrl = await TwoFactorAuth.generateQRCode(secret);

    // Generate backup codes
    const backupCodes = Array.from({ length: 5 }, () => 
      TwoFactorAuth.generateBackupCode()
    );

    res.json({
      message: 'Scan QR code with Google Authenticator',
      secret: secret.base32,
      qrCodeUrl: qrCodeUrl,
      backupCodes: backupCodes
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

// Verify 2FA - Step 2: Verify the code and enable 2FA
const verify2FA = async (req, res, db) => {
  try {
    const { email, token, secret, backupCodes } = req.body;

    if (!email || !token || !secret) {
      return res.status(400).json({ error: 'Email, token, and secret are required' });
    }

    // Verify the token
    const isValid = TwoFactorAuth.verifyToken(secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Update user in database
    await db('users')
      .where({ email })
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        backup_codes: backupCodes || []
      });

    res.json({ 
      message: '2FA enabled successfully',
      backupCodes: backupCodes 
    });

  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};

// Disable 2FA
const disable2FA = async (req, res, db) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Update user in database
    await db('users')
      .where({ email })
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null
      });

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// Verify 2FA token during login
const verifyLogin2FA = async (req, res, db) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }

    // Get user from database
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA is not enabled for this user' });
    }

    // Verify the token
    const isValid = TwoFactorAuth.verifyToken(user.two_factor_secret, token);

    if (!isValid) {
      // Check if it's a backup code
      const isBackupCode = user.backup_codes && 
        user.backup_codes.includes(token.toUpperCase());

      if (!isBackupCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Remove used backup code
      const updatedBackupCodes = user.backup_codes.filter(code => 
        code !== token.toUpperCase()
      );
      
      await db('users')
        .where({ email })
        .update({ backup_codes: updatedBackupCodes });
    }

    res.json({ 
      message: '2FA verification successful',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify login 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};



export { enable2FA, verify2FA, disable2FA, verifyLogin2FA };