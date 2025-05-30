import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { ApiLogger } from '@/lib/api-logger'
import { logError, logBusiness } from '@/lib/logger'

const createIssueSchema = z.object({
  category: z.string(),
  specificIssue: z.string(),
  severity: z.enum(['cosmetic', 'functional', 'critical']).default('functional'),
  photoUrls: z.array(z.string()).optional().default([])
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logContext = ApiLogger.logRequest(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized user')
      return response
    }

    const { data: worker } = await supabase
      .from('workers')
      .select('id, name, role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker?.is_active || worker.approval_status !== 'approved') {
      const response = NextResponse.json({ error: 'Worker not authorized' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Worker not authorized')
      return response
    }

    const body = await request.json()
    const validatedData = createIssueSchema.parse(body)

    // Check if repair exists
    const { data: repair } = await supabase
      .from('repair_orders')
      .select('repair_number')
      .eq('id', params.id)
      .single()

    if (!repair) {
      const response = NextResponse.json({ error: 'Repair not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Repair not found')
      return response
    }

    // Create the repair issue
    const { data: issue, error } = await supabase
      .from('repair_issues')
      .insert({
        repair_order_id: params.id,
        category: validatedData.category,
        specific_issue: validatedData.specificIssue,
        severity: validatedData.severity,
        photo_urls: validatedData.photoUrls
      })
      .select()
      .single()

    if (error) {
      logError(error as Error, 'DATABASE', { context: 'Create repair issue' })
      const response = NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error')
      return response
    }

    logBusiness('Repair issue added', 'QUALITY_CONTROL', {
      repairId: params.id,
      repairNumber: repair.repair_number,
      category: validatedData.category,
      severity: validatedData.severity,
      addedBy: worker.name
    })

    const response = NextResponse.json(issue)
    ApiLogger.logResponse(logContext, response, 'Repair issue created')
    return response
  } catch (error) {
    logError(error as Error, 'API_ERROR', { endpoint: 'POST /api/repairs/[id]/issues' })
    
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
      ApiLogger.logResponse(logContext, response, 'Invalid issue data')
      return response
    }
    
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, response, 'Unexpected error')
    return response
  }
}