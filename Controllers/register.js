const handleRegister = async (req, res, db, bcrypt) => {
    const { email, name, password, phone, role, course, department } = req.body;
    
    if (!email || !name || !password) {
        return res.status(400).json("Email, name, and password are required");
    }

    try {
        // Check if email already exists first
        const existingUser = await db('users').where({ email: email }).first();
        if (existingUser) {
            return res.status(400).json("Email already exists");
        }

        const saltRounds = 12;
        const hash = await bcrypt.hash(password, saltRounds);

        // Generate unique user_id with retry logic
        let user_id;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            if (role === 'student') {
                // For students: S + 8 random digits
                const randomNum = Math.floor(10000000 + Math.random() * 90000000);
                user_id = `S${randomNum}`;
            } else {
                // For other roles: role code + timestamp + random to ensure uniqueness
                const roleCode = role.charAt(0).toUpperCase();
                const timestamp = Date.now().toString().slice(-6);
                const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                user_id = `${roleCode}${timestamp}${random}`;
            }

            // Check if user_id already exists
            const existingId = await db('users').where({ user_id: user_id }).first();
            if (!existingId) {
                break; // Unique ID found
            }
            
            attempts++;
            if (attempts === maxAttempts) {
                throw new Error('Could not generate unique user ID after multiple attempts');
            }
        }

        // Insert into users table
        const user = await db('users')
            .insert({
                user_id: user_id,
                name: name,
                email: email,
                password: hash,
                phone: phone,
                role: role || 'student',
                course: course,
                department: department,
                registration_date: new Date()
            })
            .returning(['user_id', 'name', 'email', 'phone', 'role', 'course', 'department', 'registration_date']);

        res.json({
            message: "Registration successful",
            user: user[0]
        });

    } catch (err) {
        console.error('Registration error:', err);
        
        if (err.message.includes('unique constraint') || err.code === '23505') {
            return res.status(400).json("Registration failed due to duplicate information. Please try again.");
        }
        
        res.status(400).json(err.message || "Unable to register");
    }
};

export default handleRegister;