import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getDB } from '../config/database';

const router = Router();

// Development-only password reset endpoint
router.post('/dev-reset-password', async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ success: false, message: 'Only available in development' });
    return;
  }

  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      res.status(400).json({ success: false, message: 'Email and newPassword required' });
      return;
    }

    const supabase = getDB();
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password and ensure they're active
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, first_name, last_name, is_active, email_verified');
    
    if (error) {
      console.error('Database error:', error);
      res.status(500).json({ success: false, message: 'Database error', error: error.message });
      return;
    }
    
    if (!data || data.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    const user = data[0];
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        emailVerified: user.email_verified
      }
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
