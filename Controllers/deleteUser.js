
const deleteUserHandler = async (req, res, db) => {
  try {
    const { user_id } = req.body;
    const { admin_id } = req.body;

    console.log('=== DELETE USER REQUEST ===');
    console.log('Target user_id:', user_id);
    console.log('Admin user_id:', admin_id);

    // Verify admin exists and is actually an admin
    const adminUser = await db('users')
      .where({ user_id: admin_id, role: 'admin' })
      .first();

    if (!adminUser) {
      return res.status(403).json({ 
        error: "Access denied. Admin privileges required." 
      });
    }

    // Check if target user exists
    const targetUser = await db('users')
      .where({ user_id: user_id })
      .first();

    if (!targetUser) {
      return res.status(404).json({ 
        error: "User not found" 
      });
    }

    // Prevent admin from deleting themselves
    if (user_id === admin_id) {
      return res.status(400).json({ 
        error: "Cannot delete your own account" 
      });
    }

    // Start a transaction to ensure data consistency
    const trx = await db.transaction();
    
    try {
      // 1. First, check what related records exist
      const userLoans = await trx('loans').where({ user_id: user_id });
      const userReservations = await trx('reservations').where({ user_id: user_id });
      const userRecommendations = await trx('recommendations').where({ user_id: user_id });
      
      console.log('Related records found:');
      console.log('- Loans:', userLoans.length);
      console.log('- Reservations:', userReservations.length);
      console.log('- Recommendations:', userRecommendations.length);

      // 2. Delete related records in correct order (respecting foreign keys)
      
      // First delete from tables where this user_id is referenced
      await trx('recommendations').where({ user_id: user_id }).del();
      await trx('reservations').where({ user_id: user_id }).del();
      await trx('loans').where({ user_id: user_id }).del();
      
      // Also delete from login table if email exists there
      await trx('login').where({ email: targetUser.email }).del();

      // 3. Finally delete the user
      await trx('users').where({ user_id: user_id }).del();

      // Commit the transaction
      await trx.commit();

      console.log(`User ${user_id} and all related records deleted by admin ${admin_id}`);
      
      res.json({ 
        message: `User ${targetUser.name} (${user_id}) deleted successfully`,
        deleted_user: {
          user_id: targetUser.user_id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        },
        related_records_deleted: {
          loans: userLoans.length,
          reservations: userReservations.length,
          recommendations: userRecommendations.length
        }
      });

    } catch (transactionError) {
      // Rollback the transaction if anything fails
      await trx.rollback();
      throw transactionError;
    }

  } catch (err) {
    console.error('Delete user error:', err);
    
    if (err.code === '23503') {
      return res.status(400).json({ 
        error: "Cannot delete user due to existing related records. The deletion process failed.",
        details: "Please check if there are any other tables referencing this user."
      });
    }
    
    res.status(500).json({ error: "Unable to delete user" });
  }
}

export default deleteUserHandler;