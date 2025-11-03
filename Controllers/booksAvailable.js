const bookAvailHandler = async (req, res, db) => {
   try {
    const books = await db('books')
      .where('available_copies', '>', 0)
      .select('book_id', 'title', 'author', 'category', 'available_copies');
    
    res.json(books);
  } catch (err) {
    console.error('Books error:', err);
    res.status(500).json("Unable to fetch books");
  }
}

export default bookAvailHandler;
