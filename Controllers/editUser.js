import bcrypt from 'bcrypt';

// Edit user - Admin or current user
const editUserHandler = async (req, res, db) => {
  try {
    const { user_id } = req.body;
    const { 
      editor_id,      // User making the edit (admin or current user)
      name, 
      email, 
      phone, 
      course, 
      department,
      role,           // Only admin can change role
      password        // New password (optional)
    } = req.body;

    console.log('=== EDIT USER REQUEST ===');
    console.log('Target user_id:', user_id);
    console.log('Editor user_id:', editor_id);
    console.log('Update data:', { name, email, phone, course, department, role, password: password ? '***' : 'not provided' });

    // Verify editor exists
    const editorUser = await db('users')
      .where({ user_id: editor_id })
      .first();

    if (!editorUser) {
      return res.status(404).json({ 
        error: "Editor user not found" 
      });
    }

    // Check if target user exists
    const targetUser = await db('users')
      .where({ user_id: user_id })
      .first();

    if (!targetUser) {
      return res.status(404).json({ 
        error: "Target user not found" 
      });
    }

    // Authorization check
    const isAdmin = editorUser.role === 'admin';
    const isCurrentUser = editor_id === user_id;

    if (!isAdmin && !isCurrentUser) {
      return res.status(403).json({ 
        error: "Access denied. You can only edit your own profile." 
      });
    }

    // Only admin can change role
    if (role && role !== targetUser.role && !isAdmin) {
      return res.status(403).json({ 
        error: "Access denied. Only admin can change user roles." 
      });
    }

    // Only admin can edit other users' sensitive information
    if (!isAdmin && !isCurrentUser) {
      return res.status(403).json({ 
        error: "Access denied. Admin privileges required to edit other users." 
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (course !== undefined) updateData.course = course;
    if (department !== undefined) updateData.department = department;
    if (role !== undefined && isAdmin) updateData.role = role;

    // Handle password update if provided
    if (password && password.trim() !== '') {
      const saltRounds = 10;
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Use the correct column name 'password'
      updateData.password = hashedPassword;
      
      console.log('Password updated for user:', user_id);
    }

    // If no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: "No valid fields provided for update" 
      });
    }

    // Check email uniqueness if email is being changed
    if (email && email !== targetUser.email) {
      const existingUser = await db('users')
        .where({ email: email })
        .whereNot({ user_id: user_id })
        .first();

      if (existingUser) {
        return res.status(400).json({ 
          error: "Email already exists" 
        });
      }
    }

    // Update user
    await db('users')
      .where({ user_id: user_id })
      .update(updateData);

    // Get updated user
    const updatedUser = await db('users')
      .where({ user_id: user_id })
      .select('user_id', 'name', 'email', 'phone', 'role', 'course', 'department')
      .first();

    console.log(`User ${user_id} updated by ${editor_id}`);

    res.json({
      message: "User updated successfully",
      user: updatedUser,
      edited_by: editorUser.name,
      is_admin_edit: isAdmin,
      password_updated: !!password
    });

  } catch (err) {
    console.error('Edit user error:', err);
    res.status(500).json({ error: "Unable to update user" });
  }
}

export default editUserHandler;