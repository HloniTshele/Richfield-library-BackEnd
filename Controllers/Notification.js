// Notification handler for books to be returned
export const getBooksDueForReturn = async (req, res, db) => 
    {
        try 
        {
            // Get books that are due for return (due date is today or in the past)
            const dueBooks = await db('loans as l')
                .join('users as u', 'l.user_id', 'u.user_id')
                .join('books as b', 'l.book_id', 'b.book_id')
                .where('l.return_date', null) // Not returned yet
                .andWhere('l.due_date', '<=', new Date()) // Due date is today or past
                .select(
                    'l.loan_id',
                    'l.user_id',
                    'u.name as user_name',
                    'u.email as user_email',
                    'l.book_id', 
                    'b.title as book_title',
                    'b.author as book_author',
                    'l.loan_date',
                    'l.due_date',
                    db.raw("CURRENT_DATE - l.due_date as days_overdue")
                )
                .orderBy('l.due_date', 'asc');

            if (dueBooks.length === 0) 
            {
                return res.status(200).json(
                    {
                        message: 'No books are currently due for return',
                        due_books: []
                    }
                );
            }

            res.json(
                {
                    message: 'Books due for return retrieved successfully',
                    count: dueBooks.length,
                    due_books: dueBooks
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when fetching books due for return: ', err);
            
            res.status(500).json(
                { error: 'Failed to fetch books due for return' }
            );
        }
    };

// Get books due in the next 3 days (upcoming returns)
export const getUpcomingReturns = async (req, res, db) => 
    {
        try 
        {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const upcomingReturns = await db('loans as l')
                .join('users as u', 'l.user_id', 'u.user_id')
                .join('books as b', 'l.book_id', 'b.book_id')
                .where('l.return_date', null) // Not returned yet
                .andWhere('l.due_date', '>', new Date()) // Not overdue yet
                .andWhere('l.due_date', '<=', threeDaysFromNow) // Due in next 3 days
                .select(
                    'l.loan_id',
                    'l.user_id',
                    'u.name as user_name',
                    'u.email as user_email',
                    'l.book_id',
                    'b.title as book_title',
                    'b.author as book_author',
                    'l.loan_date',
                    'l.due_date',
                    db.raw("l.due_date - CURRENT_DATE as days_until_due")
                )
                .orderBy('l.due_date', 'asc');

            if (upcomingReturns.length === 0) 
            {
                return res.status(200).json(
                    {
                        message: 'No upcoming book returns in the next 3 days',
                        upcoming_returns: []
                    }
                );
            }

            res.json(
                {
                    message: 'Upcoming book returns retrieved successfully',
                    count: upcomingReturns.length,
                    upcoming_returns: upcomingReturns
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when fetching upcoming returns: ', err);
            
            res.status(500).json(
                { error: 'Failed to fetch upcoming book returns' }
            );
        }
    };

// Send email notification for overdue books
export const sendOverdueNotifications = async (req, res, db) => 
    {
        try 
        {
            const overdueBooks = await db('loans as l')
                .join('users as u', 'l.user_id', 'u.user_id')
                .join('books as b', 'l.book_id', 'b.book_id')
                .where('l.return_date', null)
                .andWhere('l.due_date', '<', new Date())
                .select(
                    'u.user_id',
                    'u.name as user_name',
                    'u.email as user_email',
                    'b.title as book_title',
                    'b.author as book_author',
                    'l.due_date',
                    db.raw("CURRENT_DATE - l.due_date as days_overdue")
                );

            if (overdueBooks.length === 0) 
            {
                return res.status(200).json(
                    {
                        message: 'No overdue books found for notifications',
                        notifications_sent: 0
                    }
                );
            }

            // Group by user to send one email per user with all their overdue books
            const usersWithOverdueBooks = {};
            overdueBooks.forEach(book => {
                if (!usersWithOverdueBooks[book.user_id]) {
                    usersWithOverdueBooks[book.user_id] = {
                        user_id: book.user_id,
                        name: book.user_name,
                        email: book.user_email,
                        overdue_books: []
                    };
                }
                usersWithOverdueBooks[book.user_id].overdue_books.push(book);
            });

            // In a real application, you would send emails here
            // For now, we'll just return the data
            const notificationResults = Object.values(usersWithOverdueBooks).map(user => ({
                user_id: user.user_id,
                user_name: user.name,
                user_email: user.email,
                overdue_books_count: user.overdue_books.length,
                books: user.overdue_books.map(book => ({
                    title: book.book_title,
                    author: book.book_author,
                    due_date: book.due_date,
                    days_overdue: book.days_overdue
                }))
            }));

            res.json(
                {
                    message: 'Overdue notifications processed successfully',
                    total_overdue_books: overdueBooks.length,
                    users_affected: notificationResults.length,
                    notifications: notificationResults
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when sending overdue notifications: ', err);
            
            res.status(500).json(
                { error: 'Failed to send overdue notifications' }
            );
        }
    };

// Send reminder for books due soon
export const sendDueSoonReminders = async (req, res, db) => 
    {
        try 
        {
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const dueSoonBooks = await db('loans as l')
                .join('users as u', 'l.user_id', 'u.user_id')
                .join('books as b', 'l.book_id', 'b.book_id')
                .where('l.return_date', null)
                .andWhere('l.due_date', '>', new Date())
                .andWhere('l.due_date', '<=', threeDaysFromNow)
                .select(
                    'u.user_id',
                    'u.name as user_name',
                    'u.email as user_email',
                    'b.title as book_title',
                    'b.author as book_author',
                    'l.due_date',
                    db.raw("l.due_date - CURRENT_DATE as days_until_due")
                );

            if (dueSoonBooks.length === 0) 
            {
                return res.status(200).json(
                    {
                        message: 'No books due soon for reminders',
                        reminders_sent: 0
                    }
                );
            }

            // Group by user
            const usersWithDueSoonBooks = {};
            dueSoonBooks.forEach(book => {
                if (!usersWithDueSoonBooks[book.user_id]) {
                    usersWithDueSoonBooks[book.user_id] = {
                        user_id: book.user_id,
                        name: book.user_name,
                        email: book.user_email,
                        due_soon_books: []
                    };
                }
                usersWithDueSoonBooks[book.user_id].due_soon_books.push(book);
            });

            const reminderResults = Object.values(usersWithDueSoonBooks).map(user => ({
                user_id: user.user_id,
                user_name: user.name,
                user_email: user.email,
                due_soon_books_count: user.due_soon_books.length,
                books: user.due_soon_books.map(book => ({
                    title: book.book_title,
                    author: book.book_author,
                    due_date: book.due_date,
                    days_until_due: book.days_until_due
                }))
            }));

            res.json(
                {
                    message: 'Due soon reminders processed successfully',
                    total_books_due_soon: dueSoonBooks.length,
                    users_affected: reminderResults.length,
                    reminders: reminderResults
                }
            );

        } catch (err) 
        {
            console.error
                    ('Error when sending due soon reminders: ', err);
            
            res.status(500).json(
                { error: 'Failed to send due soon reminders' }
            );
        }
    };