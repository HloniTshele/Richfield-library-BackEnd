/*
This controller is for the recommendations and uses knex and PosygreSQL.
*/

export const submitRecommendation = async (req, res, db) => 
    {
        // This is for submitting a recommendation
        const {
            user_id,
            book_id, 
            rating,
            review
        } = req.body;

        // This part is for validating our fields
        if (!user_id || !book_id || !rating || !review) 
        {
            return res.status(400).json(
                {
                    error: 'All the fields are necessary'
                }
            );
        }

        // Validate rating range
        if (rating < 1 || rating > 5) 
        {
            return res.status(400).json(
                {
                    error: 'Rating must be between 1 and 5'
                }
            );
        }

        try
        {
            // Generate a shorter recommendation ID (max 10 characters)
            const recommendation_id = `REC${Date.now().toString().slice(-7)}`;
            
            /* This will allow us to take
            the recommendations and then add it to the database */
            await db('recommendations').insert(
                {   
                    // Use the shorter generated ID
                    recommendation_id: recommendation_id,
                    user_id: user_id,
                    book_id: book_id,
                    rating: rating,
                    review: review,
                    // This will use our current date
                    review_date: db.fn.now()
                }
            );

            res.status(201).json(
                {
                    message: 'Recommendations have been submitted!',
                    recommendation_id: recommendation_id
                }
            );
        }
        catch (err) 
        {
            console.error('Error occurred when submitting the recommendation', err);

            // Handle specific database errors
            if (err.code === '23505') {
                return res.status(400).json(
                    {
                        error: 'Recommendation ID already exists'
                    }
                );
            }
            if (err.code === '23503') {
                return res.status(400).json(
                    {
                        error: 'User or book does not exist'
                    }
                );
            }

            res.status(500).json(
                {
                    error: 'Recommendation submission has failed'
                }
            );    
        }
    };

    export const getRecommendations = async (req, res, db) => 
    {
        try {
        const { userId } = req.params;
        
        console.log('Fetching recommendations for user:', userId);
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Simple recommendation logic: get books from categories the user has borrowed before
        // Or get popular available books if no borrowing history
        db.raw(`
            WITH user_categories AS (
                SELECT DISTINCT b.category 
                FROM loans l 
                JOIN books b ON l.book_id = b.book_id 
                WHERE l.user_id = ? AND l.status = 'returned'
            ),
            recommended_books AS (
                SELECT b.*,
                       CASE 
                           WHEN b.category IN (SELECT category FROM user_categories) THEN 1 
                           ELSE 0 
                       END as preference_score
                FROM books b
                WHERE b.status = 'available'
                ORDER BY preference_score DESC, b.title ASC
                LIMIT 6
            )
            SELECT * FROM recommended_books
        `, [userId])
            .then(result => {
                const recommendations = result.rows || [];
                console.log(`Found ${recommendations.length} recommendations`);
                
                res.json({
                    success: true,
                    recommendedBooks: recommendations
                });
            })
            .catch(err => {
                console.error('Database error fetching recommendations:', err);
                // Fallback: return some available books
                db.select('*').from('books')
                    .where('status', 'available')
                    .limit(6)
                    .then(books => {
                        res.json({
                            success: true,
                            recommendedBooks: books
                        });
                    })
                    .catch(fallbackErr => {
                        console.error('Fallback also failed:', fallbackErr);
                        res.json({
                            success: true,
                            recommendedBooks: []
                        });
                    });
            });
    } catch (error) {
        console.error('Recommendations handler error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
    };