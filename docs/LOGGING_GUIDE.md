# 🚀 **SUPER SIMPLE LOGGING GUIDE**

> **TL;DR**: Just copy and paste these examples. You don't need to understand how it works!

## **Step 1: How to Add Logging to ANY API Route**

Just add these 3 lines to any API route:

```typescript
// Add this import at the top
import { ApiLogger } from '@/lib/api-logger'

// Add this as the first line in your function
const logContext = ApiLogger.logRequest(request)

// Add this before you return your response
ApiLogger.logResponse(logContext, response, 'What happened here')
```

### **Complete Example:**
```typescript
import { ApiLogger } from '@/lib/api-logger'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)  // ← ADD THIS
  
  try {
    // Your existing code here...
    const response = NextResponse.json({ success: true })
    
    ApiLogger.logResponse(logContext, response, 'Everything worked!')  // ← ADD THIS
    return response
  } catch (error) {
    const errorResponse = NextResponse.json({ error: 'Failed' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Something broke')  // ← ADD THIS
    return errorResponse
  }
}
```

## **Step 2: How to Log Important Events**

When something important happens in your app, just add one line:

```typescript
// Add this import at the top
import { logBusiness } from '@/lib/logger'

// Then use it anywhere like this:
logBusiness('User approved a worker', 'USER_APPROVAL', {
  workerId: 'some-id',
  approvedBy: 'manager-id'
})

logBusiness('Order imported successfully', 'ORDER_IMPORT', {
  orderId: 'order-123',
  itemCount: 5
})

logBusiness('Batch completed', 'BATCH_DONE', {
  batchId: 'batch-456'
})
```

## **Step 3: How to Log Errors**

When something goes wrong:

```typescript
// Add this import at the top
import { logError } from '@/lib/logger'

// Then use it in your catch blocks:
try {
  // Your code here
} catch (error) {
  logError(error as Error, 'WHAT_BROKE', {
    userId: 'user-123',
    whatever: 'extra info you want'
  })
}
```

## **Step 4: How to View Your Logs**

1. Go to your app: `http://localhost:3003`
2. Login as a manager
3. Go to: `http://localhost:3003/manager/logs`
4. You'll see all your logs!

## **Step 5: Test It Right Now**

Let's test the logging system:

1. **Open this URL in your browser:**
   ```
   http://localhost:3003/api/test/create-pending-user
   ```

2. **Send this data** (use Postman, Insomnia, or curl):
   ```json
   {
     "email": "test@example.com",
     "name": "Test User"
   }
   ```

3. **Check your logs** at: `http://localhost:3003/manager/logs`

## **That's It! 🎉**

### **You only need to remember 3 things:**

1. **API Routes**: Add `ApiLogger.logRequest()` and `ApiLogger.logResponse()`
2. **Important Events**: Use `logBusiness('what happened', 'CATEGORY', { details })`
3. **Errors**: Use `logError(error, 'WHERE', { details })`

## **When You Need Help**

Just send me:
1. A screenshot of your logs page
2. Or copy-paste the log entry that's confusing you
3. Tell me what you were trying to do

## **What Gets Logged Automatically**

The logging system will automatically capture:
- ✅ All API requests and responses
- ✅ Performance timing
- ✅ Error stack traces
- ✅ User information
- ✅ Request correlations

## **Real Examples from Your App**

### **Example 1: Batch Transition API**
```typescript
import { ApiLogger } from '@/lib/api-logger'
import { logBusiness, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    // Your batch transition logic...
    
    logBusiness('Batch transition completed', 'BATCH_TRANSITION', {
      batchId: 'batch-123',
      fromStage: 'cutting',
      toStage: 'assembly'
    })
    
    const response = NextResponse.json({ success: true })
    ApiLogger.logResponse(logContext, response, 'Batch transitioned successfully')
    return response
    
  } catch (error) {
    logError(error as Error, 'BATCH_TRANSITION', {
      batchId: 'batch-123'
    })
    
    const errorResponse = NextResponse.json({ error: 'Failed' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Batch transition failed')
    return errorResponse
  }
}
```

### **Example 2: User Approval**
```typescript
import { logBusiness } from '@/lib/logger'

// Somewhere in your approval logic:
logBusiness('Worker approval granted', 'USER_MANAGEMENT', {
  workerId: worker.id,
  workerEmail: worker.email,
  approvedBy: currentUser.id,
  role: worker.role
})
```

### **Example 3: Order Processing**
```typescript
import { logBusiness, logError } from '@/lib/logger'

try {
  // Process order...
  
  logBusiness('Order imported from Shopify', 'ORDER_IMPORT', {
    orderId: order.id,
    shopifyOrderId: order.shopify_order_id,
    itemCount: order.items.length,
    totalValue: order.total_price
  })
  
} catch (error) {
  logError(error as Error, 'ORDER_IMPORT', {
    shopifyOrderId: shopifyOrder.id
  })
}
```

## **Common Contexts to Use**

Use these context names for consistency:

- `USER_MANAGEMENT` - User approvals, suspensions, role changes
- `ORDER_IMPORT` - Shopify order imports
- `BATCH_TRANSITION` - Workflow stage changes
- `TASK_ASSIGNMENT` - Worker task assignments
- `QUALITY_CONTROL` - QC checks and holds
- `AUTH` - Login/logout events
- `API_ERROR` - API failures
- `DATABASE` - Database operations
- `PERFORMANCE` - Slow operations

## **Quick Copy-Paste Templates**

### **For API Routes:**
```typescript
import { ApiLogger } from '@/lib/api-logger'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    // Your code here
    const response = NextResponse.json({ success: true })
    ApiLogger.logResponse(logContext, response, 'Operation completed')
    return response
  } catch (error) {
    logError(error as Error, 'YOUR_CONTEXT', { additionalInfo: 'value' })
    const errorResponse = NextResponse.json({ error: 'Failed' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Operation failed')
    return errorResponse
  }
}
```

### **For Business Events:**
```typescript
import { logBusiness } from '@/lib/logger'

logBusiness('Description of what happened', 'CONTEXT', {
  key1: 'value1',
  key2: 'value2'
})
```

### **For Errors:**
```typescript
import { logError } from '@/lib/logger'

try {
  // risky code
} catch (error) {
  logError(error as Error, 'CONTEXT', { 
    relevantId: 'some-id',
    additionalContext: 'helpful info'
  })
}
```

---

**You don't need to understand how it works - just copy and paste the examples above!** 📋

Want me to show you how to add logging to a specific file? Just show me the file and I'll give you the exact code to copy-paste! 