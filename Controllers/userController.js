export const getAllUsers = async (req, res, db) => 
    {
        // Here we are going to pull all the users from our database.

        try
        {
            const users =
                     await db('users')
                     .select('user_id', 'name', 'email', 'phone', 'role', 'course', 'department', 'registration_date', 'two_factor_enabled');
            
            // Our users is returned as a JSON
            res.json(users);       

        } catch (err) 
        {
            console.error
                    ('Error fetching users: ', err);
            
            res.status (500).json(
                {error: 'Users were not fetched'}
            );     
        }
    };

export const getUserByText = async (req, res, db) => 
    {
        const { search } 
                = req.query;
        
        try 
        {
            if (!search || search.trim() === '') 
            {
                return res.status(400).json(
                    { error: 'Please provide a search term' }
                );
            }

            const searchTerm = `%${search.trim()}%`;
            
            const users = 
                await db('users')
                    .where('name', 'ILIKE', searchTerm)
                    .orWhere('email', 'ILIKE', searchTerm)
                    .orWhere('role', 'ILIKE', searchTerm)
                    .orWhere('course', 'ILIKE', searchTerm)
                    .orWhere('department', 'ILIKE', searchTerm)
                    .select('user_id', 'name', 'email', 'phone', 'role', 'course', 'department', 'registration_date', 'two_factor_enabled');
            
            if (users.length === 0) 
            {
                return res.status(404).json(
                    { 
                        message: 'No users found matching your search',
                        search_term: search
                    }
                );
            }

            res.json(
                {
                    message: 'Users found successfully',
                    count: users.length,
                    search_term: search,
                    users: users
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when searching for users: ', err);
            
            res.status(500).json(
                { error: 'Failed to search for users' }
            );
        }
    };

// getUserById function
export const getUserById = async (req, res, db) => {
    try {
        const { user_id } = req.params; // Get from URL params, not query
        
        console.log('=== GET USER BY ID REQUEST ===');
        console.log('User ID parameter:', user_id);

        if (!user_id) {
            return res.status(400).json({ 
                error: 'User ID is required',
                example: 'Use /user/123 (not /user/id?id=123)'
            });
        }

        const user = await db('users')
            .where({ user_id: user_id })
            .select('user_id', 'name', 'email', 'phone', 'role', 'course', 'department', 'two_factor_enabled')
            .first();

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                user_id: user_id
            });
        }

        console.log('User found:', user);
        res.json(user);

    } catch (err) {
        console.error('Error in getUserById:', err);
        res.status(500).json({ 
            error: 'Database error while fetching user',
            details: err.message
        });
    }
};

// In userController.js
export const getUserByRole = async (req, res, db) => {
    try {
        const { role } = req.query;
        
        console.log('Fetching users with role:', role);

        if (!role) {
            return res.status(400).json({ 
                error: 'Role parameter is required' 
            });
        }

        // Validate role
        const validRoles = ['student', 'librarian', 'admin', 'lecturer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                error: 'Invalid role. Must be: student, librarian, admin, or lecturer' 
            });
        }

        const users = await db('users')
            .where({ role: role })
            .select('user_id', 'name', 'email', 'role', 'course', 'department', 'two_factor_enabled');

        console.log(`Found ${users.length} users with role ${role}`);

        res.json({
            message: `Users with role ${role} retrieved successfully`,
            count: users.length,
            users: users
        });

    } catch (err) {
        console.error('Error fetching users by role:', err);
        res.status(500).json({ 
            error: 'Failed to fetch users by role' 
        });
    }
};

export const getUsersWithLoans = async (req, res, db) => 
    {
        try  
        {
            const usersWithLoans = await db('users as u')
                .join('loans as l', 'u.user_id', 'l.user_id')
                .where('l.return_date', null) // Active loans only
                .distinct('u.user_id')
                .select(
                    'u.user_id', 
                    'u.name', 
                    'u.email', 
                    'u.role',
                    db.raw('COUNT(l.loan_id) as active_loans_count')
                )
                .groupBy('u.user_id', 'u.name', 'u.email', 'u.role');
            
            if (usersWithLoans.length === 0) 
            {
                return res.status(404).json(
                    { 
                        message: 'No users with active loans found'
                    }
                );
            }  
            
            res.json(
                {
                    message: 'Users with active loans retrieved successfully',
                    count: usersWithLoans.length,
                    users: usersWithLoans
                }
            ); 

        } catch (err) 
        {
            console.error('Error when fetching users with loans: ', err);
            res.status(500).json(
                { error: 'Failed to fetch users with active loans' }
            );         
        }        
    };

export const getUsersWithOverdueBooks = async (req, res, db) => 
    {
        try  
        {
            const usersWithOverdue = await db('users as u')
                .join('loans as l', 'u.user_id', 'l.user_id')
                .where('l.return_date', null) // Not returned
                .where('l.due_date', '<', new Date()) // Overdue
                .distinct('u.user_id')
                .select(
                    'u.user_id', 
                    'u.name', 
                    'u.email', 
                    'u.role',
                    'u.phone',
                    db.raw('COUNT(l.loan_id) as overdue_books_count')
                )
                .groupBy('u.user_id', 'u.name', 'u.email', 'u.role', 'u.phone');
            
            if (usersWithOverdue.length === 0) 
            {
                return res.status(404).json(
                    { 
                        message: 'No users with overdue books found'
                    }
                );
            }  
            
            res.json(
                {
                    message: 'Users with overdue books retrieved successfully',
                    count: usersWithOverdue.length,
                    users: usersWithOverdue
                }
            ); 

        } catch (err) 
        {
            console.error('Error when fetching users with overdue books: ', err);
            res.status(500).json(
                { error: 'Failed to fetch users with overdue books' }
            );         
        }        
    };

