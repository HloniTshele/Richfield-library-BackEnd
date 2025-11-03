const loanedBookHandler = async (req, res, db) => {
   try {
    const { user_id } = req.params;
    const loans = await db('loans')
      .join('books', 'loans.book_id', 'books.book_id')
      .where('loans.user_id', user_id)
      .select('loans.*', 'books.title', 'books.author', 'books.isbn');
    
    res.json(loans);
  } catch (err) {
    console.error('Loans error:', err);
    res.status(500).json("Unable to fetch loans");
  }
}

export default loanedBookHandler;
