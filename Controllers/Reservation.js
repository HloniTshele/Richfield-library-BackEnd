const createReservation = async (req, res, db) => {
  try {
    const { user_id, book_id } = req.body;

    console.log('=== CREATE RESERVATION REQUEST ===');
    console.log('User ID:', user_id);
    console.log('Book ID:', book_id);

    // Generate shorter reservation ID (max 10 characters)
    const reservation_id = `R${Date.now().toString().slice(-9)}`; // Results in "R123456789" (10 chars)
    
    // Alternative: Use sequential numbering if you have a counter
    // const reservation_id = `RES${(await db('reservations').count('* as count').first()).count + 1}`.padStart(10, '0');

    console.log('Generated reservation_id:', reservation_id);

    // Check if user exists
    const user = await db('users').where({ user_id: user_id }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if book exists
    const book = await db('books').where({ book_id: book_id }).first();
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Create reservation
    await db('reservations').insert({
      reservation_id: reservation_id,
      user_id: user_id,
      book_id: book_id,
      reservation_date: new Date(),
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending'
    });

    console.log('Reservation created successfully:', reservation_id);

    res.json({
      message: "Reservation created successfully",
      reservation: {
        reservation_id: reservation_id,
        user_id: user_id,
        book_id: book_id,
        user_name: user.name,
        book_title: book.title,
        reservation_date: new Date(),
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending'
      }
    });

  } catch (err) {
    console.error('Create reservation error:', err);
    console.error('Error details:', err.message);
    
    // Handle specific database errors
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: "Reservation ID already exists" });
    }
    if (err.code === '22001') { // String data right truncation
      return res.status(400).json({ error: "Generated ID too long for database" });
    }
    
    res.status(500).json({ error: "Unable to create reservation" });
  }
}

export default createReservation;