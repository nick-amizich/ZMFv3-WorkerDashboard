import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Standard production stages
const STANDARD_STAGES = [
  {
    stage: 'sanding',
    name: 'Sanding',
    description: 'Sand headphone cups to prepare for finishing',
    estimated_hours: 2.0,
    required_skills: ['sanding'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'finishing',
    name: 'UV Coating',
    description: 'Apply UV protective coating',
    estimated_hours: 1.5,
    required_skills: ['finishing'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'sub_assembly',
    name: 'Sub Assembly',
    description: 'Prepare components for main assembly',
    estimated_hours: 1.0,
    required_skills: ['assembly'],
    is_optional: true,
    is_standard: true,
    is_custom: false
  },
  {
    stage: 'assembly',
    name: 'Assembly',
    description: 'Main headphone assembly process',
    estimated_hours: 3.0,
    required_skills: ['assembly'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'initial_qc',
    name: 'Initial QC',
    description: 'Initial quality control inspection',
    estimated_hours: 0.5,
    required_skills: ['qc'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'acoustic_testing',
    name: 'Acoustic Testing',
    description: 'Test acoustic performance and tuning',
    estimated_hours: 1.0,
    required_skills: ['acoustic_testing'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'final_qc',
    name: 'Final QC',
    description: 'Final quality control and approval',
    estimated_hours: 0.5,
    required_skills: ['qc'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'packaging',
    name: 'Packaging',
    description: 'Package headphones for shipping',
    estimated_hours: 0.5,
    required_skills: ['packaging'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  },
  {
    stage: 'shipping',
    name: 'Shipping',
    description: 'Prepare for shipment and logistics',
    estimated_hours: 0.25,
    required_skills: ['shipping'],
    is_standard: true,
    is_custom: false,
    is_optional: false
  }
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get custom stages
    const { data: customStages, error: customStagesError } = await supabase
      .from('custom_stages')
      .select(`
        stage_code,
        stage_name,
        description,
        default_estimated_hours,
        required_skills,
        created_by_id
      `)
      .eq('is_active', true)
      .order('stage_name', { ascending: true })
    
    if (customStagesError) {
      console.error('Error fetching custom stages:', customStagesError)
      return NextResponse.json({ error: 'Failed to fetch custom stages' }, { status: 500 })
    }
    
    // Transform custom stages to match standard format
    const transformedCustomStages = (customStages || []).map((stage: any) => ({
      stage: stage.stage_code,
      name: stage.stage_name,
      description: stage.description || '',
      estimated_hours: stage.default_estimated_hours || 1.0,
      required_skills: stage.required_skills || [],
      is_standard: false,
      is_custom: true,
      is_optional: false,
      created_by_id: stage.created_by_id
    }))
    
    // Combine standard and custom stages
    const allStages = [
      ...STANDARD_STAGES,
      ...transformedCustomStages
    ]
    
    // Get URL parameters for filtering
    const url = new URL(request.url)
    const includeOptional = url.searchParams.get('include_optional') !== 'false'
    const stageType = url.searchParams.get('type') // 'standard', 'custom', or 'all'
    
    let filteredStages = allStages
    
    // Filter by type
    if (stageType === 'standard') {
      filteredStages = filteredStages.filter(stage => stage.is_standard)
    } else if (stageType === 'custom') {
      filteredStages = filteredStages.filter(stage => stage.is_custom)
    }
    
    // Filter optional stages
    if (!includeOptional) {
      filteredStages = filteredStages.filter(stage => !stage.is_optional)
    }
    
    return NextResponse.json(filteredStages)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 