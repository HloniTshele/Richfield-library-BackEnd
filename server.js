import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import knex from 'knex';
import cors from 'cors';
import handleRegister from './Controllers/register.js';
import handleLogin from './Controllers/signIn.js';
import { enable2FA, verify2FA, disable2FA, verifyLogin2FA } from './Controllers/twoFactorAuth.js';
import profileHandler from './Controllers/profile.js';
import bookAvailHandler from './Controllers/booksAvailable.js';
import loanedBookHandler from './Controllers/UserLoans.js';
import deleteUserHandler from './Controllers/deleteUser.js';
import editUserHandler from './Controllers/editUser.js';
import createReservation from './Controllers/Reservation.js';
import{getAllBooks ,getBookById, getBookByText, updateBook, deleteBook} from './Controllers/booksController.js';
import {submitRecommendation,getRecommendations} from './Controllers/recommendationController.js';
import{getBooksDueForReturn, getUpcomingReturns, sendOverdueNotifications, sendDueSoonReminders} from './Controllers/Notification.js';
import { getAllUsers,getUserById, getUserByText, getUserByRole,getUsersWithLoans,getUsersWithOverdueBooks } from './Controllers/userController.js';
import { getAllLoans, getLoanById, getLoansByStatus, getOverdueLoans, createLoan,  returnLoan, updateLoanDueDate, deleteLoan } from './Controllers/loanController.js';



const db = knex({
  client: 'pg',
  connection: {
    connectionString: 'postgresql://postgres:admin@localhost:5432/library_management',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'library_management',
    password: 'admin'
  },
  pool: { min: 2, max: 10 }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Test database connection
// db.raw('SELECT 1')
//   .then(() => console.log('Database connected successfully'))
//   .catch(err => console.error('Database connection failed:', err));

app.post('/signin', (req, res) => { handleLogin(req, res, db, bcrypt) });
app.post('/register', (req, res) => { handleRegister(req, res, db, bcrypt) });

app.post('/enable-2fa', (req, res) => { enable2FA(req, res, db) });
app.post('/verify-2fa', (req, res) => { verify2FA(req, res, db) });
app.post('/disable-2fa', (req, res) => { disable2FA(req, res, db) });
app.post('/verify-login-2fa', (req, res) => { verifyLogin2FA(req, res, db) });
// Get user Profile Details 
app.get('/profile/:user_id',(req,res)=>{profileHandler(req,res,db)});

// Get available books
app.get('/books/available', async (req, res) => {bookAvailHandler(req,res,db)});

// Get User Loans
app.get('/loans/:user_id', async (req, res) => {loanedBookHandler(req,res,db)});

// Test function to debug 2FA verification




// Reservation routes
app.post('/reservations/create', (req, res) => createReservation(req, res, db));
//books request
app.get('/books/all', (req,res)=>getAllBooks(req,res,db));
app.get('/books/id', (req,res)=> getBookById(req,res,db));
app.get('/books/searchtext', (req,res)=> getBookByText(req,res,db));
app.put('/books/update',  (req,res)=> updateBook(req,res,db));
app.delete('/books/delete',  (req,res)=> deleteBook(req,res,db));

//User request
app.get('/user/all', (req, res) => getAllUsers(req, res, db));
app.get('/user/searchtext', (req, res) => getUserByText(req, res, db));
app.get('/user/role', (req, res) => getUserByRole(req, res, db));
app.get('/user/with-loans', (req, res) => getUsersWithLoans(req, res, db));
app.get('/user/with-overdue', (req, res) => getUsersWithOverdueBooks(req, res, db));
app.put('/editUsers/:user_id', (req, res) => editUserHandler(req, res, db));
app.delete('/users/:user_id', (req, res) => deleteUserHandler(req, res, db));
app.get('/user/:user_id', (req, res) => getUserById(req, res, db));

app.get('/loans/all', (req, res) => getAllLoans(req, res, db));
app.get('/loans/:loan_id', (req, res) => getLoanById(req, res, db));
app.get('/loans/status/filter', (req, res) => getLoansByStatus(req, res, db));
app.get('/loans/overdue/all', (req, res) => getOverdueLoans(req, res, db));
app.post('/loans/create', (req, res) => createLoan(req, res, db));
app.put('/loans/return', (req, res) => returnLoan(req, res, db));
app.put('/loans/update-due-date', (req, res) => updateLoanDueDate(req, res, db));
app.delete('/loans/delete', (req, res) => deleteLoan(req, res, db));

// Debug endpoint to check database tables and relationships

app.get('/debug/database-check', async (req, res) => {
    try {
        console.log('=== DATABASE STRUCTURE CHECK ===');
        
        // Check if tables exist and have data
        const loansCount = await db('loans').count('* as count').first();
        const usersCount = await db('users').count('* as count').first();
        const booksCount = await db('books').count('* as count').first();
        
        console.log('Loans count:', loansCount.count);
        console.log('Users count:', usersCount.count);
        console.log('Books count:', booksCount.count);
        
        let result = {
            loans_count: loansCount.count,
            users_count: usersCount.count,
            books_count: booksCount.count,
            sample_loan: null,
            test_join: null,
            user_exists: null,
            book_exists: null
        };
        
        // Check a sample loan with joins
        const sampleLoan = await db('loans')
            .select('loans.loan_id', 'loans.user_id', 'loans.book_id')
            .first();
        console.log('Sample loan:', sampleLoan);
        result.sample_loan = sampleLoan;
        
        // Test the join query step by step
        if (sampleLoan) {
            const userExists = await db('users').where('user_id', sampleLoan.user_id).first();
            const bookExists = await db('books').where('book_id', sampleLoan.book_id).first();
            
            console.log('User exists:', !!userExists);
            console.log('Book exists:', !!bookExists);
            
            result.user_exists = !!userExists;
            result.book_exists = !!bookExists;
            
            // Test the full join query
            const testJoin = await db('loans')
                .select(
                    'loans.loan_id',
                    'users.name as user_name',
                    'books.title as book_title'
                )
                .leftJoin('users', 'loans.user_id', 'users.user_id')
                .leftJoin('books', 'loans.book_id', 'books.book_id')
                .where('loans.loan_id', sampleLoan.loan_id)
                .first();
                
            console.log('Test join result:', testJoin);
            result.test_join = testJoin;
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Database check error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/loans/complete', async (req, res) => {
    try {
        console.log('=== FETCHING COMPLETE LOAN DATA ===');
        
        const loans = await db('loans')
            .select(
                'loans.loan_id',
                'loans.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'users.role as user_role',
                'loans.book_id',
                'books.title as book_title',
                'books.author as book_author',
                'books.isbn as book_isbn',
                'books.category as book_category',
                'books.publisher as book_publisher',
                'loans.loan_date',
                'loans.due_date',
                'loans.return_date',
                'loans.status',
                'loans.created_at'
            )
            .leftJoin('users', 'loans.user_id', 'users.user_id')
            .leftJoin('books', 'loans.book_id', 'books.book_id')
            .orderBy('loans.loan_date', 'desc');

        console.log(`✅ Found ${loans.length} loans with complete data`);
        
        res.json(loans);
        
    } catch (error) {
        console.error('❌ Error fetching complete loan data:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch loan data',
            details: error.message 
        });
    }
});

//recommendations 
app.post('/recommendation', (req, res)=>submitRecommendation(req, res, db));
//for getting the recommendations
app.get('/recommendation/:userId', (req, res)=> getRecommendations(req, res, db));

// Notification routes for book returns
app.get('/notifications/books-due', (req, res) => getBooksDueForReturn(req, res, db));
app.get('/notifications/upcoming-returns', (req, res) => getUpcomingReturns(req, res, db));
app.post('/notifications/send-overdue', (req, res) => sendOverdueNotifications(req, res, db));
app.post('/notifications/send-reminders', (req, res) => sendDueSoonReminders(req, res, db));


app.listen(3000, () => {
  console.log('App is running on port 3000');
});


