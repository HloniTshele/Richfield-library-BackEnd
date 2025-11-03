const handleRegister = async (req, res, db, bcrypt) => {
    const { email, name, password, phone, role, course, department } = req.body;
    
    if (!email || !name || !password) {
        return res.status(400).json("Email, name, and password are required");
    }

    try {
        const saltRounds = 12;
        const hash = await bcrypt.hash(password, saltRounds);

        // Generate user_id
        let user_id;
        
        if (role === 'student') {
            const randomNum = Math.floor(10000000 + Math.random() * 90000000);
            user_id = `S${randomNum}`;
        } else {
            const roleCode = role.charAt(0).toUpperCase();
            const countResult = await db('users')
                .where({ role: role })
                .count('* as count')
                .first();
            const sequence = parseInt(countResult.count) + 1;
            user_id = `${roleCode}${String(sequence).padStart(3, '0')}`;
        }

        // Insert directly into users table
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
        
        if (err.code === '23505') {
            return res.status(400).json("Email already exists");
        }
        
        res.status(400).json("Unable to register");
    }
};

export default handleRegister;