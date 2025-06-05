# User Approval Guide

## How User Management Works in ZMF Worker Dashboard

### 🔄 Two Registration Flows

#### 1. **Standard Registration (Requires Approval)**
- User goes to `/register`
- Fills out registration form
- Creates account
- Account is created with `approval_status: 'pending'`
- User receives email confirmation
- **User appears in "Pending Approval" section**
- Manager must approve before user can log in

#### 2. **Invitation-Based Registration (Pre-Approved)**
- Manager sends invitation from `/manager/users`
- User receives invitation link with token
- User registers using invitation link
- Account is automatically approved
- User can start working immediately after email confirmation

### 📋 Where to See Pending Users

1. **Go to**: `/manager/users`
2. **Look for**: 
   - Yellow alert box at top showing pending count
   - "Pending Approval" tab in the tabs section
3. **If no pending users**: You'll see the blue info box explaining the process

### 🔍 Why You Might Not See Pending Users

1. **No one has registered yet** - Users must complete registration at `/register`
2. **All users were invited** - Invited users are pre-approved
3. **Database column issue** - Fixed in latest update
4. **You're not logged in as a manager** - Only managers can see pending approvals

### ✅ How to Test the Approval Flow

#### Option 1: Use Test Button (Development Only)
1. Go to `/manager/users`
2. Click "Create Test Pending User" button
3. Refresh the page
4. You should see a pending approval

#### Option 2: Register a New User
1. Open an incognito/private browser window
2. Go to `/register`
3. Register with a new email
4. Return to manager dashboard
5. Check `/manager/users` for pending approval

#### Option 3: Check Database Directly
```sql
-- Run this query to see all workers and their approval status
SELECT id, name, email, approval_status, created_at 
FROM workers 
ORDER BY created_at DESC;
```

### 🎯 Approval Actions

When you see a pending user:
- **Approve**: User becomes active and can log in
- **Reject**: User is marked as rejected with reason

### 🚀 Quick Troubleshooting

1. **Check if anyone has registered**:
   - Look in Supabase dashboard → Authentication → Users
   - Check workers table for entries

2. **Verify your role**:
   - You must be logged in as a manager
   - Your account must have `role: 'manager'`

3. **Test the flow**:
   - Use the test button in development
   - Or register a test account

### 📊 Database Schema

The workers table tracks approval with these fields:
- `approval_status`: 'pending' | 'approved' | 'rejected'
- `approved_by`: ID of manager who approved
- `approved_at`: Timestamp of approval
- `rejection_reason`: Reason if rejected

### 🔐 Security Notes

- Only managers can approve/reject users
- Workers must be approved AND have confirmed email
- Invited users skip approval but still need email confirmation
- All actions are logged (when audit table exists)

---

## Still Not Seeing Pending Users?

If you've registered users but don't see them pending:

1. **Check the workers table directly** in Supabase
2. **Ensure approval_status column exists** and has values
3. **Verify the API is working**: Check browser console for errors
4. **Try the test button** to create a known pending user

The system is working correctly when:
- New registrations show as pending
- Invited users are pre-approved
- Managers can approve/reject
- Approved users can log in