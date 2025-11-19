export const getAllBooks = async (req, res, db) => 
    {
        //Here we are goin to pull all the books from our database.

        try
        {
            const books =
                     await db('books').select('*');
            
            //Our books is returned as a JSON
            res.json(books);       

        }catch (err) 
        {
            console.error
                    ('Error fetching books: ', err);
            
            res.status (500).json(
                {error: 'Books where not fetched'}
            );     
        }
    };


export const getBookByText = async (req, res, db) => 
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
            
            const books = 
                await db('books')
                    .where('title', 'ILIKE', searchTerm)
                    .orWhere('author', 'ILIKE', searchTerm)
                    .orWhere('category', 'ILIKE', searchTerm)
                    .orWhere('isbn', 'ILIKE', searchTerm)
                    .select('*');
            
            if (books.length === 0) 
            {
                return res.status(404).json(
                    { 
                        message: 'No books found matching your search',
                        search_term: search
                    }
                );
            }

            res.json(
                {
                    message: 'Books found successfully',
                    count: books.length,
                    search_term: search,
                    books: books
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when searching for books: ', err);
            
            res.status(500).json(
                { error: 'Failed to search for books' }
            );
        }
    };
    export const getBookById = async (req, res, db) => 
    {
        // Fixed: Get ID from query instead of params
        const { id } = req.query;
        
        try  
        {
            if (!id) 
            {
                return res.status(400).json(
                    { error: 'Book ID is required' }
                );
            }

            const book = await db('books').where({ book_id: id }).first();
            
            if (!book) return res.status(404).json(
                { error: 'The book that you are looking for cannot be found' }
            );  
            
            res.json(book); 

        } catch (err) 
        {
            console.error('Error when fetching your book: ', err);
            res.status(500).json(
                { error: 'Failed to fetch the book that you are looking for' }
            );         
        }        
    };

export const updateBook = async (req, res, db) => 
    {
        // Fixed: Get ID from body instead of params
        const { id, ...updateData } = req.body;

        try 
        {
            if (!id) 
            {
                return res.status(400).json(
                    { error: 'Book ID is required for update' }
                );
            }

            // Fixed: Corrected 'legnth' to 'length'
            const updated = await db('books').where({ book_id: id }).update(updateData).returning('*');
            
            if (updated.length === 0) return res.status(400).json(
                { error: 'The book that you are looking for cannot be found' }
            );

            res.json(
                { message: 'Book has been successfully updated! ', book: updated[0] }
            );
        } catch (err) 
        {
            console.error('Error when updating book: ', err);
            res.status(500).json(
                { error: 'The book has failed to update' }
            );
        }
    };

// backend
export const deleteBook = async (req, res, db) => {
    // Fixed: Get ID from body instead of params
    const { id } = req.body;
    
    try {
        if (!id) {
            return res.status(400).json({ error: 'Book ID is required for deletion' });
        }

        // Check if the book is currently loaned
        const activeLoans = await db('loans')
            .where({ 
                book_id: id, 
                status: 'active' 
            })
            .select('loan_id');

        if (activeLoans.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete book: Book is currently loaned out' 
            });
        }

        // Fixed: Corrected 'legnth' to 'length'
        const deleted = await db('books').where({ book_id: id }).del().returning('*');
        
        if (deleted.length === 0) {
            return res.status(404).json({ error: 'Book has not been found' });
        }
        
        res.json({ 
            message: 'Book has been successfully deleted!', 
            book: deleted[0] 
        });

    } catch (err) {
        console.error('Error when deleting book: ', err);
        res.status(500).json({ error: 'Failed to delete the book' });
    }
};