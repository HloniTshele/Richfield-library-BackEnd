// Controllers/reservationController.js
export const getAllReservations = async (req, res, db) => {
    try {
        console.log('=== GET ALL RESERVATIONS ===');
        
        const reservations = await db('reservations')
            .select(
                'reservations.reservation_id',
                'reservations.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'users.role as user_role',
                'reservations.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'books.isbn as book_isbn',
                'books.category as book_category',
                'reservations.reservation_date',
                'reservations.expiry_date',
                'reservations.status',
                'reservations.created_at'
            )
            .leftJoin('users', 'reservations.user_id', 'users.user_id')
            .leftJoin('books', 'reservations.book_id', 'books.book_id')
            .orderBy('reservations.reservation_date', 'desc');

        console.log(`Found ${reservations.length} reservations`);

        res.json({
            success: true,
            count: reservations.length,
            reservations: reservations
        });

    } catch (err) {
        console.error('Error fetching reservations:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reservations',
            details: err.message
        });
    }
};

export const getPendingReservations = async (req, res, db) => {
    try {
        console.log('=== GET PENDING RESERVATIONS ===');
        
        const reservations = await db('reservations')
            .select(
                'reservations.reservation_id',
                'reservations.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'users.role as user_role',
                'reservations.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'books.isbn as book_isbn',
                'books.category as book_category',
                'reservations.reservation_date',
                'reservations.expiry_date',
                'reservations.status',
                'reservations.created_at'
            )
            .leftJoin('users', 'reservations.user_id', 'users.user_id')
            .leftJoin('books', 'reservations.book_id', 'books.book_id')
            .where('reservations.status', 'pending')
            .orderBy('reservations.reservation_date', 'asc');

        console.log(`Found ${reservations.length} pending reservations`);

        res.json({
            success: true,
            count: reservations.length,
            reservations: reservations
        });

    } catch (err) {
        console.error('Error fetching pending reservations:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending reservations',
            details: err.message
        });
    }
};

export const updateReservationStatus = async (req, res, db) => {
    try {
        const { reservation_id, status } = req.body;
        
        console.log('Updating reservation status:', { reservation_id, status });

        if (!reservation_id || !status) {
            return res.status(400).json({
                success: false,
                error: 'reservation_id and status are required'
            });
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: pending, confirmed, cancelled, or expired'
            });
        }

        // Start transaction
        const trx = await db.transaction();

        try {
            // Get reservation details
            const reservation = await trx('reservations')
                .where({ reservation_id })
                .first();

            if (!reservation) {
                await trx.rollback();
                return res.status(404).json({
                    success: false,
                    error: 'Reservation not found'
                });
            }

            // Update reservation status
            await trx('reservations')
                .where({ reservation_id })
                .update({ status });

            // If confirming a reservation and book is available, create a loan
            if (status === 'confirmed') {
                const book = await trx('books')
                    .where({ book_id: reservation.book_id })
                    .first();

                if (book && book.status === 'available') {
                    // Create loan for the reservation
                    const generateShortId = () => {
                        const timestamp = Date.now().toString(36);
                        const random = Math.random().toString(36).substr(2, 4);
                        return `L${timestamp}${random}`.substr(0, 10);
                    };

                    const loanId = generateShortId();
                    const loanDate = new Date();
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 3); // 3-day loan period

                    await trx('loans')
                        .insert({
                            loan_id: loanId,
                            user_id: reservation.user_id,
                            book_id: reservation.book_id,
                            loan_date: loanDate,
                            due_date: dueDate,
                            status: 'active'
                        });

                    // Update book status
                    await trx('books')
                        .where({ book_id: reservation.book_id })
                        .update({ 
                            status: 'borrowed',
                            available_copies: db.raw('GREATEST(available_copies - 1, 0)')
                        });

                    console.log('Auto-created loan for confirmed reservation:', loanId);
                }
            }

            await trx.commit();

            console.log('Reservation status updated successfully:', reservation_id);

            res.json({
                success: true,
                message: `Reservation ${status} successfully`
            });

        } catch (transactionError) {
            await trx.rollback();
            throw transactionError;
        }

    } catch (err) {
        console.error('Error updating reservation status:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update reservation status',
            details: err.message
        });
    }
};

export const deleteReservation = async (req, res, db) => {
    try {
        const { reservation_id } = req.body;
        
        console.log('Deleting reservation:', { reservation_id });

        if (!reservation_id) {
            return res.status(400).json({
                success: false,
                error: 'reservation_id is required'
            });
        }

        const deleted = await db('reservations')
            .where({ reservation_id })
            .del();

        if (deleted === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reservation not found'
            });
        }

        console.log('Reservation deleted successfully:', reservation_id);

        res.json({
            success: true,
            message: 'Reservation deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting reservation:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete reservation',
            details: err.message
        });
    }
};