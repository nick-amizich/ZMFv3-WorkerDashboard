import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      componentId, 
      checkpointId, 
      status, 
      checkResults, 
      scores, 
      notes, 
      defectTypes,
      taskId 
    } = body
    
    // Validate worker
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (workerError || !worker || !worker.is_active) {
      return NextResponse.json({ error: 'Worker not found or inactive' }, { status: 403 })
    }
    
    // Calculate overall score
    const overallScore = Math.round((scores.looks + scores.hardware + scores.sound) / 3)
    
    // Create inspection result
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspection_results')
      .insert({
        component_tracking_id: componentId,
        checkpoint_id: checkpointId,
        inspector_id: worker.id,
        status,
        overall_score: overallScore,
        check_results: checkResults,
        defect_types: defectTypes || [],
        notes,
        metadata: {
          task_id: taskId,
          scores,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()
    
    if (inspectionError) {
      console.error('Error creating inspection:', inspectionError)
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 })
    }
    
    // If failed, create quality hold
    if (status === 'failed') {
      const { error: holdError } = await supabase
        .from('quality_holds')
        .insert({
          component_tracking_id: componentId,
          reported_by: worker.id,
          hold_reason: `Failed quality checkpoint: ${defectTypes.join(', ')}`,
          severity: 'high',
          status: 'open'
        })
      
      if (holdError) {
        console.error('Error creating quality hold:', holdError)
      }
    }
    
    // Update component tracking with latest inspection
    const { error: updateError } = await supabase
      .from('component_tracking')
      .update({
        current_location: status === 'passed' ? 'next_stage' : 'rework',
        quality_status: status === 'passed' ? 'good' : status === 'needs_rework' ? 'rework' : 'hold',
        updated_at: new Date().toISOString()
      })
      .eq('id', componentId)
    
    if (updateError) {
      console.error('Error updating component:', updateError)
    }
    
    // Check if this creates a quality pattern
    if (status !== 'passed' && defectTypes.length > 0) {
      // Check for similar recent defects
      const { data: similarDefects } = await supabase
        .from('inspection_results')
        .select('*')
        .contains('defect_types', defectTypes)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10)
      
      if (similarDefects && similarDefects.length >= 3) {
        // Potential pattern detected - log it
        await supabase
          .from('quality_patterns')
          .upsert({
            issue_type: defectTypes[0],
            stage: checkpointId,
            occurrence_count: similarDefects.length + 1,
            last_seen: new Date().toISOString(),
            severity_trend: 'increasing'
          }, {
            onConflict: 'issue_type,stage'
          })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      inspection,
      message: status === 'passed' 
        ? 'Quality checkpoint passed' 
        : status === 'needs_rework'
        ? 'Component marked for rework'
        : 'Quality hold created'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}