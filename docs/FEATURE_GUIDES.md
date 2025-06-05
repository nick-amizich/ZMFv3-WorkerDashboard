# 🎯 ZMF V3 Feature Guides

**Complete guide to all features, user management, and page navigation**

---

## 👥 User Management System

### 🔄 Two Registration Flows

#### 1. **Standard Registration (Requires Approval)**
- User goes to `/register`
- Fills out registration form
- Creates account with `approval_status: 'pending'`
- User receives email confirmation
- **User appears in "Pending Approval" section**
- Manager must approve before user can log in

#### 2. **Invitation-Based Registration (Pre-Approved)**
- Manager sends invitation from `/manager/users`
- User receives invitation link with token
- User registers using invitation link
- Account is automatically approved
- User can start working immediately after email confirmation

### 📋 Managing User Approvals

#### Where to See Pending Users
1. **Navigate to**: `/manager/users`
2. **Look for**: 
   - Yellow alert box at top showing pending count
   - "Pending Approval" tab in the tabs section
3. **If no pending users**: You'll see blue info box explaining the process

#### Approval Actions
When you see a pending user:
- **Approve**: User becomes active and can log in
- **Reject**: User is marked as rejected with reason
- **Send Invitation**: Create pre-approved invitation link
- **Activate/Deactivate**: Toggle user access

#### Why You Might Not See Pending Users
1. **No one has registered yet** - Users must complete registration at `/register`
2. **All users were invited** - Invited users are pre-approved
3. **You're not logged in as a manager** - Only managers can see pending approvals

### ✅ Testing the Approval Flow

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

### 🔐 Security & Permissions

#### Database Schema
The workers table tracks approval with these fields:
- `approval_status`: 'pending' | 'approved' | 'rejected'
- `approved_by`: ID of manager who approved
- `approved_at`: Timestamp of approval
- `rejection_reason`: Reason if rejected
- `suspension_reason`: If user is suspended
- `suspended_at`: Timestamp of suspension

#### Security Notes
- Only managers can approve/reject users
- Workers must be approved AND have confirmed email
- Invited users skip approval but still need email confirmation
- All actions are logged in audit trail

---

## 📍 Complete Page Navigation Guide

### 🏢 Manager Pages

#### Core Management
1. **Dashboard** (`/manager/dashboard`) ✅
   - Overview of production metrics
   - Quick stats and recent activity
   - Key performance indicators

2. **Dashboard V3** (`/manager/dashboard-v3`) 🆕
   - Quality-focused dashboard
   - Real-time quality metrics
   - Predictive quality alerts

3. **User Management** (`/manager/users`) ✅
   - View pending worker registrations
   - Approve/reject workers
   - Send pre-approved invitations
   - Manage worker status

#### Production Management
4. **Production Flow** (`/manager/production-flow`) 🔄
   - Visual Kanban board for production stages
   - Drag-and-drop batch management
   - Real-time stage tracking

5. **Tasks** (`/manager/tasks`) ⚠️ 
   - Task assignment board
   - Drag tasks to assign to workers
   - Task status tracking

6. **Orders** (`/manager/orders`) ✅
   - List of all orders
   - Order details and status
   - Order history

7. **Import Orders** (`/manager/orders/import`) ⚠️
   - Import from Shopify
   - Creates tasks automatically
   - Batch import functionality

#### Quality Management (V3)
8. **Quality Holds** (`/manager/quality-holds`) 🆕
   - View and manage quality holds
   - Assign holds to workers
   - Track hold resolution
   - Escalation management

9. **Components** (`/manager/components`) 🆕
   - Component search and tracking
   - QR code generation
   - Component journey visualization
   - Quality certificate generation

10. **Analytics** (`/manager/analytics`) 🆕
    - Production analytics dashboard
    - Quality analytics
    - Real-time metrics and reports
    - First-pass yield calculations

#### Workflow & Automation
11. **Workflows** (`/manager/workflows`) 🆕
    - Visual workflow builder
    - Create custom production workflows
    - Quality checkpoint configuration

12. **Automation** (`/manager/automation`) 🆕
    - Automation rules management
    - Create workflow automation
    - Quality-based triggers

#### System Management
13. **Workers** (`/manager/workers`) ✅
    - List of all workers
    - Worker management
    - Skill assignments

14. **Settings** (`/manager/settings`) ✅
    - System settings
    - Shopify configuration
    - Email settings

15. **Logs** (`/manager/logs`) 🔧
    - System logs and debugging
    - API request tracking
    - Error monitoring

#### Testing & Development
16. **Workflow Test** (`/manager/workflow-test`) 🧪
    - Automated API endpoint testing
    - Visual workflow integration diagram
    - Manual testing checklist

### 👷 Worker Pages

1. **Worker Dashboard** (`/worker/dashboard`) ✅
   - Worker's task list
   - Time tracking
   - Current assignments

2. **Quality Dashboard** (`/worker/quality`) 🆕
   - Personal quality metrics
   - Recent inspection history
   - Quality patterns awareness
   - Achievement system

3. **Tasks** (`/worker/tasks`) ✅
   - Assigned tasks
   - Task completion
   - Progress tracking

### 🔐 Authentication Pages

1. **Login** (`/login`) ✅
   - User authentication
   - Role-based redirects

2. **Register** (`/register`) ✅
   - New user registration
   - Email confirmation
   - Approval workflow

3. **Auth Callback** (`/auth/callback`) 🔧
   - Email confirmation handling
   - Authentication processing

---

## 🚀 Key Features Overview

### 🎯 Quality System (V3)

#### Component Tracking
- **QR Code Generation**: Each component gets unique QR code
- **Journey Visualization**: Complete component history
- **Quality Certificates**: Downloadable quality reports
- **Serial Number Tracking**: Automated serial number generation

#### Quality Checkpoints
- **Worker Inspection Modal**: Easy-to-use inspection interface
- **Score Tracking**: Looks, hardware, and sound scores
- **Pass/Fail/Rework Status**: Clear quality outcomes
- **Automatic Hold Creation**: Failed inspections trigger holds

#### Quality Analytics
- **First-Pass Yield**: Calculate quality success rates
- **Defect Rate Tracking**: Monitor quality trends
- **Dynamic Grouping**: Analyze by stage, worker, or model
- **Predictive Alerts**: Early warning system for quality issues

#### Quality Holds Management
- **Hold Creation**: Create holds for quality issues
- **Assignment**: Assign holds to specific workers
- **Escalation**: Automatic escalation for unresolved holds
- **Resolution Tracking**: Complete hold lifecycle management

### 🔄 Workflow System

#### Visual Workflow Builder
- **Drag-and-Drop Interface**: Easy workflow creation
- **Stage Configuration**: Define production stages
- **Quality Gates**: Integrate quality checkpoints
- **Automation Rules**: Set up automatic transitions

#### Production Flow Board
- **Kanban Interface**: Visual production pipeline
- **Batch Management**: Track production batches
- **Real-time Updates**: Live status updates
- **Stage Transitions**: Smooth workflow progression

### 🤖 Automation System

#### Rule Engine
- **Quality-Based Triggers**: Automate based on quality metrics
- **Task Assignment**: Automatic task distribution
- **Notification System**: Alert relevant personnel
- **Workflow Automation**: Streamline production processes

#### Predictive Analytics
- **Pattern Detection**: Identify quality patterns
- **Trend Analysis**: Predict quality issues
- **Performance Metrics**: Track system performance
- **Optimization Suggestions**: Improve workflows

---

## 🔧 Troubleshooting Common Issues

### Empty Tasks Page
**Issue**: No tasks showing because no tasks exist in the database
**Solution**: 
1. Import orders first from `/manager/orders/import`
2. Select specific order items to import
3. Tasks will be created automatically

### Order Import Not Creating Tasks
**Issue**: Orders import but tasks aren't being created
**Quick Fix**: 
1. Go to `/manager/orders/import`
2. Click refresh to load Shopify orders
3. Select orders and specific items
4. Click "Import Selected"
5. Verify tasks appear in `/manager/tasks`

### Missing Pages in Navigation
**Issue**: Several completed pages aren't accessible
**Solution**:
1. Check if navigation is scrollable on smaller screens
2. Try refreshing the page
3. Check browser console for errors
4. Verify user role permissions

### User Approval Not Working
**Issue**: Pending users not appearing
**Troubleshooting**:
1. Check if anyone has actually registered
2. Verify your role is 'manager'
3. Look in Supabase dashboard → Authentication → Users
4. Check workers table for approval_status column

### Quality Features Not Loading
**Issue**: V3 quality features not accessible
**Solution**:
1. Verify database migrations are applied
2. Check that V3 tables exist
3. Regenerate TypeScript types if needed
4. Test with `/manager/workflow-test`

---

## 🧪 Testing Your System

### 1. Test User Management
```bash
# Navigate to manager interface
/manager/users

# Actions to test:
- Send an invitation
- Register with invitation link
- Verify pre-approval works
- Test approval/rejection flow
```

### 2. Test Quality Flow
```bash
# Create and test quality workflow
1. Create a batch with workflow
2. Assign to worker
3. Complete quality checkpoint
4. Check quality analytics update
```

### 3. Test Order Import
```bash
# Import and verify task creation
1. Go to /manager/orders/import
2. Refresh to load Shopify orders
3. Select order and specific items
4. Import and verify tasks created
```

### 4. Run Integration Tests
```bash
# Use built-in test page
/manager/workflow-test

# Actions:
- Click "Run Tests"
- Verify all endpoints work
- Complete manual checklist
```

---

## 📋 Feature Checklist

### ✅ Completed Features
- [x] User registration and approval system
- [x] Invitation-based pre-approval
- [x] Quality checkpoint system
- [x] Component tracking with QR codes
- [x] Quality analytics dashboard
- [x] Quality holds management
- [x] Worker quality dashboard
- [x] Visual workflow builder
- [x] Production flow board
- [x] Automation rules engine
- [x] Manager oversight tools

### 🚧 In Progress
- [ ] Quality checkpoint integration with tasks
- [ ] Automation rule execution
- [ ] Real-time updates optimization
- [ ] Performance testing

### 📋 Planned Features
- [ ] Photo/voice capture for inspections
- [ ] Slack notifications
- [ ] Advanced ML pattern detection
- [ ] Gamification badges
- [ ] Environmental monitoring

---

## 🎯 Quick Start Guide

### For New Managers
1. **Set up your account**: Register and get approved
2. **Configure Shopify**: Go to `/manager/settings`
3. **Import orders**: Use `/manager/orders/import`
4. **Create workflows**: Use `/manager/workflows`
5. **Invite workers**: Use `/manager/users`

### For New Workers
1. **Register**: Use invitation link or register at `/register`
2. **Wait for approval**: If not pre-approved
3. **Access dashboard**: Go to `/worker/dashboard`
4. **View quality metrics**: Check `/worker/quality`
5. **Complete tasks**: Use task interface

### For Testing
1. **Use test features**: `/manager/workflow-test`
2. **Create test data**: Use test buttons where available
3. **Check logs**: Monitor `/manager/logs`
4. **Verify database**: Check Supabase dashboard

---

**🎉 Your ZMF Worker Dashboard is feature-complete with comprehensive user management, quality tracking, and workflow automation!** 