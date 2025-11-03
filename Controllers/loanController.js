// Controllers/loanController.js
export const getAllLoans = async (req, res, db) => {
    try {
        console.log('=== GET ALL LOANS ===');
        
        const loans = await db('loans')
            .select(
                'loans.loan_id',
                'loans.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'loans.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'loans.loan_date',
                'loans.due_date',
                'loans.return_date',
                'loans.status',
                'loans.created_at'
            )
            .leftJoin('users', 'loans.user_id', 'users.user_id')
            .leftJoin('books', 'loans.book_id', 'books.book_id')
            .orderBy('loans.loan_date', 'desc');

        console.log(`Found ${loans.length} loans`);

        // Return direct array for frontend compatibility
        res.json(loans);

    } catch (err) {
        console.error('Error fetching all loans:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loans',
            details: err.message
        });
    }
};

export const getLoanById = async (req, res, db) => {
    try {
        const { loan_id } = req.params;
        
        console.log('Fetching loan by ID:', loan_id);

        if (!loan_id) {
            return res.status(400).json({
                success: false,
                error: 'Loan ID is required'
            });
        }

        const loan = await db('loans')
            .select(
                'loans.loan_id',
                'loans.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'loans.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'books.isbn as book_isbn',
                'loans.loan_date',
                'loans.due_date',
                'loans.return_date',
                'loans.status',
                'loans.created_at'
            )
            .leftJoin('users', 'loans.user_id', 'users.user_id')
            .leftJoin('books', 'loans.book_id', 'books.book_id')
            .where('loans.loan_id', loan_id)
            .first();

        if (!loan) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }

        res.json({
            success: true,
            loan: loan
        });

    } catch (err) {
        console.error('Error fetching loan by ID:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loan',
            details: err.message
        });
    }
};

export const getLoansByStatus = async (req, res, db) => {
    try {
        const { status } = req.query;
        
        console.log('Fetching loans by status:', status);

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status parameter is required'
            });
        }

        const validStatuses = ['active', 'returned', 'overdue'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: active, returned, or overdue'
            });
        }

        let query = db('loans')
            .select(
                'loans.loan_id',
                'loans.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'loans.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'loans.loan_date',
                'loans.due_date',
                'loans.return_date',
                'loans.status',
                'loans.created_at'
            )
            .leftJoin('users', 'loans.user_id', 'users.user_id')
            .leftJoin('books', 'loans.book_id', 'books.book_id');

        if (status === 'active') {
            query = query.where('loans.status', 'active');
        } else if (status === 'returned') {
            query = query.where('loans.status', 'returned');
        } else if (status === 'overdue') {
            query = query.where('loans.status', 'active')
                        .where('loans.due_date', '<', new Date());
        }

        const loans = await query.orderBy('loans.due_date', 'asc');

        console.log(`Found ${loans.length} loans with status: ${status}`);

        res.json({
            success: true,
            message: `Found ${loans.length} ${status} loans`,
            count: loans.length,
            loans: loans
        });

    } catch (err) {
        console.error('Error fetching loans by status:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loans by status',
            details: err.message
        });
    }
};

export const getOverdueLoans = async (req, res, db) => {
    try {
        console.log('Fetching overdue loans...');
        
        const currentDate = new Date().toISOString().split('T')[0];
        
        const loans = await db('loans')
            .select(
                'loans.loan_id',
                'loans.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'loans.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'loans.loan_date',
                'loans.due_date',
                'loans.return_date',
                'loans.status',
                'loans.created_at'
            )
            .leftJoin('users', 'loans.user_id', 'users.user_id')
            .leftJoin('books', 'loans.book_id', 'books.book_id')
            .where('loans.status', 'active')
            .where('loans.due_date', '<', currentDate)
            .orderBy('loans.due_date', 'asc');

        console.log(`Found ${loans.length} overdue loans`);

        res.json({
            success: true,
            message: `Found ${loans.length} overdue loans`,
            count: loans.length,
            loans: loans
        });

    } catch (err) {
        console.error('Error fetching overdue loans:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch overdue loans',
            details: err.message
        });
    }
};

export const createLoan = async (req, res, db) => {
    try {
        const { user_id, book_id, due_date } = req.body;
        
        console.log('Creating new loan:', { user_id, book_id, due_date });

        if (!user_id || !book_id || !due_date) {
            return res.status(400).json({
                success: false,
                error: 'user_id, book_id, and due_date are required'
            });
        }

        // Verify user exists
        const user = await db('users').where({ user_id }).first();
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify book exists and is available
        const book = await db('books').where({ book_id }).first();
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }

        if (book.status !== 'available') {
            return res.status(400).json({
                success: false,
                error: 'Book is not available for loan'
            });
        }

        // Start transaction
        const trx = await db.transaction();

        try {
            // Generate a short loan_id that fits within 10 characters
            const generateShortId = () => {
                const timestamp = Date.now().toString(36); // Base36 timestamp
                const random = Math.random().toString(36).substr(2, 4); // 4 random chars
                return `L${timestamp}${random}`.substr(0, 10); // Ensure max 10 chars
            };

            let loanId = generateShortId();
            
            // Check if loan_id already exists (unlikely but safe)
            let attempts = 0;
            let existingLoan = await trx('loans').where({ loan_id: loanId }).first();
            while (existingLoan && attempts < 5) {
                loanId = generateShortId();
                existingLoan = await trx('loans').where({ loan_id: loanId }).first();
                attempts++;
            }

            if (existingLoan) {
                throw new Error('Could not generate unique loan ID');
            }

            console.log('Generated loan_id:', loanId);

            // Create loan record with short loan_id
            const [loan] = await trx('loans')
                .insert({
                    loan_id: loanId,
                    user_id,
                    book_id,
                    loan_date: new Date(),
                    due_date: new Date(due_date),
                    status: 'active'
                })
                .returning('*');

            // Update book status
            await trx('books')
                .where({ book_id })
                .update({ status: 'borrowed' });

            // Commit transaction
            await trx.commit();

            console.log('Loan created successfully:', loan.loan_id);

            res.status(201).json({
                success: true,
                message: 'Loan created successfully',
                loan: loan
            });

        } catch (transactionError) {
            await trx.rollback();
            throw transactionError;
        }

    } catch (err) {
        console.error('Error creating loan:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to create loan',
            details: err.message
        });
    }
};
export const returnLoan = async (req, res, db) => {
    try {
        const { loan_id } = req.body; // Removed admin_id
        
        console.log('Processing loan return:', { loan_id });

        if (!loan_id) {
            return res.status(400).json({
                success: false,
                error: 'loan_id is required'
            });
        }

        // Start transaction
        const trx = await db.transaction();

        try {
            // Get loan details
            const loan = await trx('loans')
                .where({ loan_id })
                .first();

            if (!loan) {
                await trx.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Loan not found'
                });
            }

            if (loan.status === 'returned') {
                await trx.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Loan is already returned'
                });
            }

            // Update loan status - ONLY using columns that exist
            await trx('loans')
                .where({ loan_id })
                .update({
                    status: 'returned',
                    return_date: new Date()
                    // Removed returned_by since it doesn't exist in your schema
                });

            // Update book status to available
            await trx('books')
                .where({ book_id: loan.book_id })
                .update({ status: 'available' });

            // Commit transaction
            await trx.commit();

            console.log('Loan returned successfully:', loan_id);

            res.json({
                success: true,
                message: 'Book returned successfully'
            });

        } catch (transactionError) {
            await trx.rollback();
            throw transactionError;
        }

    } catch (err) {
        console.error('Error returning loan:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to return loan',
            details: err.message
        });
    }
};

export const updateLoanDueDate = async (req, res, db) => {
    try {
        const { loan_id, due_date } = req.body; // Removed admin_id
        
        console.log('Updating loan due date:', { loan_id, due_date });

        if (!loan_id || !due_date) {
            return res.status(400).json({
                success: false,
                error: 'loan_id and due_date are required'
            });
        }

        // Validate date format
        const dueDate = new Date(due_date);
        if (isNaN(dueDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid due date format. Use YYYY-MM-DD'
            });
        }

        // Update only the fields that exist in your schema
        const updated = await db('loans')
            .where({ loan_id })
            .update({
                due_date: dueDate
                // Removed updated_by and updated_at since they don't exist
            })
            .returning('*');

        if (updated.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }

        console.log('Loan due date updated successfully:', loan_id);

        res.json({
            success: true,
            message: 'Due date updated successfully',
            loan: updated[0]
        });

    } catch (err) {
        console.error('Error updating loan due date:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update due date',
            details: err.message
        });
    }
};

export const deleteLoan = async (req, res, db) => {
    try {
        const { loan_id } = req.body; // Removed admin_id
        
        console.log('Deleting loan:', { loan_id });

        if (!loan_id) {
            return res.status(400).json({
                success: false,
                error: 'loan_id is required'
            });
        }

        // Start transaction
        const trx = await db.transaction();

        try {
            // Get loan details first
            const loan = await trx('loans')
                .where({ loan_id })
                .first();

            if (!loan) {
                await trx.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Loan not found'
                });
            }

            // If loan is active, return the book first
            if (loan.status === 'active') {
                await trx('books')
                    .where({ book_id: loan.book_id })
                    .update({ status: 'available' });
            }

            // Delete the loan
            await trx('loans')
                .where({ loan_id })
                .del();

            // Commit transaction
            await trx.commit();

            console.log('Loan deleted successfully:', loan_id);

            res.json({
                success: true,
                message: 'Loan deleted successfully'
            });

        } catch (transactionError) {
            await trx.rollback();
            throw transactionError;
        }

    } catch (err) {
        console.error('Error deleting loan:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete loan',
            details: err.message
        });
    }
};