import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const issueType = searchParams.get('issue_type')
    const limit = parseInt(searchParams.get('limit') || '5')
    
    // Build query
    let query = supabase
      .from('quality_patterns')
      .select('*')
      .order('occurrence_count', { ascending: false })
      .order('last_seen', { ascending: false })
      .limit(limit)
    
    if (stage) {
      query = query.eq('stage', stage)
    }
    
    if (issueType) {
      query = query.eq('issue_type', issueType)
    }
    
    const { data: patterns, error } = await query
    
    if (error) throw error
    
    // Transform data for frontend consumption
    const transformedPatterns = patterns.map(pattern => ({
      issue_type: pattern.issue_type,
      frequency: pattern.occurrence_count,
      typical_cause: pattern.common_causes?.[0] || 'Unknown cause',
      prevention_tip: pattern.prevention_tips?.[0] || 'Follow standard procedures',
      last_seen: pattern.last_seen,
      severity_trend: pattern.severity_trend,
      affected_models: pattern.affected_models,
      affected_materials: pattern.affected_materials
    }))
    
    return NextResponse.json(transformedPatterns)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update quality pattern (managers only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers can update patterns
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      stage,
      issue_type,
      common_causes,
      effective_solutions,
      prevention_tips,
      affected_models,
      affected_materials
    } = body
    
    if (!stage || !issue_type) {
      return NextResponse.json({ 
        error: 'Stage and issue_type are required' 
      }, { status: 400 })
    }
    
    // Upsert pattern
    const { data, error } = await supabase
      .from('quality_patterns')
      .upsert({
        stage,
        issue_type,
        common_causes: common_causes || [],
        effective_solutions: effective_solutions || [],
        prevention_tips: prevention_tips || [],
        affected_models: affected_models || [],
        affected_materials: affected_materials || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stage,issue_type'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      pattern: data 
    }, { status: 201 })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}