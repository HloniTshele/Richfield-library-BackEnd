const profileHandler = async (req, res, db) => {
 try {
        // For GET /profile/:user_id, user_id comes from req.params, not req.body
        const { user_id } = req.params;
        
        console.log('Fetching profile for user:', user_id);
        
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        db.select('*').from('users').where('user_id', user_id)
            .then(user => {
                if (user.length) {
                    console.log('Profile found:', user[0]);
                    res.json(user[0]);
                } else {
                    console.log('Profile not found for user:', user_id);
                    res.status(404).json({ error: 'User not found' });
                }
            })
            .catch(err => {
                console.error('Database error fetching profile:', err);
                res.status(500).json({ error: 'Failed to fetch profile' });
            });
    } catch (error) {
        console.error('Profile handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default profileHandler;
