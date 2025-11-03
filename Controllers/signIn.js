const handleLogin = async (req, res, db, bcrypt) => {
    let { email, password } = req.body;

    // Convert email to lowercase for case-insensitive search
    email = email.toLowerCase().trim();

    console.log('=== LOGIN DEBUG ===');
    console.log('Login attempt for email:', email);
    console.log('Password received (first 3 chars):', password ? password.substring(0, 3) + '...' : 'undefined');

    if (!email || !password) {
        return res.status(400).json({ 
            error: "Email and password are required"
        });
    }

    try {
        // FIXED: Use proper Knex syntax for case-insensitive search
        const user = await db('users')
            .where(db.raw('LOWER(email) = ?', [email.toLowerCase()]))
            .select('user_id', 'name', 'email', 'phone', 'role', 'course', 'department', 'registration_date', 'password', 'two_factor_enabled')
            .first();

        console.log('User found in database:', user ? 'Yes' : 'No');
        
        if (user) {
            console.log('User details:', {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                password_length: user.password ? user.password.length : 'none'
            });
        }

        if (!user) {
            // Small delay to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$fakehashforTimingAttackPrevention');
            return res.status(400).json({ 
                error: "Invalid credentials - user not found",
                email: email
            });
        }

        // Compare password with bcrypt
        console.log('Comparing passwords...');
        const isValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isValid);
        
        if (!isValid) {
            console.log('Password comparison failed');
            return res.status(400).json({ 
                error: "Invalid credentials - wrong password",
                hint: "Check if password is correctly hashed in database"
            });
        }

        // Check if 2FA is enabled
        if (user.two_factor_enabled) {
            console.log('2FA is enabled for user');
            return res.json({
                message: "2FA required",
                requires2FA: true,
                email: user.email
            });
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        console.log('Login successful for user:', user.name);
        res.json({
            message: "Login successful",
            user: userWithoutPassword
        });

    } catch (err) {
        console.error('Login error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ 
            error: "Unable to login",
            details: err.message 
        });
    }
};

export default handleLogin;