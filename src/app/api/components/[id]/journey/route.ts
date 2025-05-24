import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee/worker details
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const componentId = params.id
    const body = await request.json()
    const {
      stage,
      duration_minutes,
      checks_passed,
      issues,
      photos
    } = body
    
    // Validate required fields
    if (!stage) {
      return NextResponse.json({ 
        error: 'Stage is required' 
      }, { status: 400 })
    }
    
    // Get current component
    const { data: component, error: fetchError } = await supabase
      .from('component_tracking')
      .select('*')
      .eq('id', componentId)
      .single()
    
    if (fetchError || !component) {
      return NextResponse.json({ 
        error: 'Component not found' 
      }, { status: 404 })
    }
    
    // Add new journey entry
    const journey = component.journey || []
    const newJourneyEntry = {
      stage,
      worker: employee.name,
      timestamp: new Date().toISOString(),
      duration_minutes,
      checks_passed: checks_passed || [],
      issues: issues || [],
      photos: photos || []
    }
    
    journey.push(newJourneyEntry)
    
    // Update final metrics
    const finalMetrics = component.final_metrics || {}
    
    // Update total production hours
    if (duration_minutes) {
      finalMetrics.total_production_hours = 
        (finalMetrics.total_production_hours || 0) + (duration_minutes / 60)
    }
    
    // Update rework count if there were issues
    if (issues && issues.length > 0) {
      finalMetrics.rework_count = (finalMetrics.rework_count || 0) + 1
    }
    
    // Calculate quality score (simple calculation based on issues)
    const totalStages = journey.length
    const stagesWithIssues = journey.filter((j: any) => j.issues && j.issues.length > 0).length
    finalMetrics.quality_score = Math.round(((totalStages - stagesWithIssues) / totalStages) * 100)
    
    // Update component
    const { data: updatedComponent, error: updateError } = await supabase
      .from('component_tracking')
      .update({
        journey,
        final_metrics: finalMetrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', componentId)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    return NextResponse.json({ 
      success: true,
      component: updatedComponent
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}