import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface QualityPassport {
  serialNumber: string
  componentType: string
  model: string
  woodType?: string
  woodSource?: string
  craftspeople: Array<{
    name: string
    stage: string
    date: string
  }>
  qualityScore: number
  inspections: Array<{
    stage: string
    passed: boolean
    date: string
    inspector: string
  }>
  measurements?: {
    [key: string]: any
  }
  productionTimeline: Array<{
    stage: string
    startDate: string
    endDate: string
    duration: number
  }>
  warranty: {
    startDate: string
    duration: string
    coverage: string[]
  }
  certificateId: string
  issuedDate: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get component ID from query
    const searchParams = request.nextUrl.searchParams
    const componentId = searchParams.get('component_id')
    
    if (!componentId) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 })
    }
    
    // Fetch component details with full journey
    const { data: component, error: componentError } = await supabase
      .from('component_tracking')
      .select(`
        *,
        work_tasks (
          id,
          type,
          stage,
          started_at,
          completed_at,
          actual_hours,
          workers:assigned_to (
            id,
            name
          ),
          work_batches (
            order_items (
              product_name,
              variant_name,
              sku,
              orders (
                customer_name,
                order_number
              )
            )
          )
        )
      `)
      .eq('id', componentId)
      .single()
    
    if (componentError || !component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 })
    }
    
    // Fetch all inspections for this component
    const { data: inspections } = await supabase
      .from('inspection_results')
      .select(`
        *,
        quality_checkpoints (
          stage,
          name,
          severity
        ),
        workers:inspected_by (
          name
        )
      `)
      .eq('component_id', componentId)
      .order('inspected_at', { ascending: true })
    
    // Calculate quality score
    const totalInspections = inspections?.length || 0
    const passedInspections = inspections?.filter(i => i.passed).length || 0
    const qualityScore = totalInspections > 0 
      ? Math.round((passedInspections / totalInspections) * 100) 
      : 100
    
    // Build craftspeople list
    const craftspeople: any[] = []
    if (component.journey && Array.isArray(component.journey)) {
      component.journey.forEach((step: any) => {
        if (step.worker && step.stage && step.timestamp) {
          craftspeople.push({
            name: step.worker,
            stage: step.stage,
            date: new Date(step.timestamp).toISOString()
          })
        }
      })
    }
    
    // If no journey data, use work task info
    if (craftspeople.length === 0 && component.work_tasks?.workers) {
      craftspeople.push({
        name: component.work_tasks.workers.name,
        stage: component.work_tasks.stage || component.work_tasks.type,
        date: component.work_tasks.completed_at || component.work_tasks.started_at
      })
    }
    
    // Build production timeline
    const productionTimeline: any[] = []
    if (component.work_tasks) {
      const task = component.work_tasks
      if (task.started_at && task.completed_at) {
        const duration = (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / (1000 * 60 * 60)
        productionTimeline.push({
          stage: task.stage || task.type,
          startDate: task.started_at,
          endDate: task.completed_at,
          duration: Math.round(duration * 10) / 10 // Round to 1 decimal
        })
      }
    }
    
    // Get product details
    const orderItem = component.work_tasks?.work_batches?.order_items
    const model = orderItem?.product_name || component.model || 'Custom'
    const variant = orderItem?.variant_name || ''
    
    // Generate certificate
    const certificate: QualityPassport = {
      serialNumber: component.serial_number,
      componentType: component.type,
      model: model + (variant ? ` - ${variant}` : ''),
      woodType: component.specifications?.wood_type,
      woodSource: component.specifications?.wood_source,
      craftspeople,
      qualityScore,
      inspections: inspections?.map(i => ({
        stage: i.quality_checkpoints?.stage || 'inspection',
        passed: i.passed,
        date: i.inspected_at,
        inspector: i.workers?.name || 'Quality Team'
      })) || [],
      measurements: component.specifications?.measurements,
      productionTimeline,
      warranty: {
        startDate: new Date().toISOString(),
        duration: 'Lifetime',
        coverage: [
          'Manufacturing defects',
          'Material failures',
          'Workmanship issues',
          'Component matching'
        ]
      },
      certificateId: `ZMF-${new Date().getFullYear()}-${component.serial_number}`,
      issuedDate: new Date().toISOString()
    }
    
    // Log certificate generation
    await supabase
      .from('quality_patterns')
      .insert({
        stage: 'certificate',
        issue_type: 'certificate_generated',
        occurrence_count: 1,
        common_causes: [`Component ${component.serial_number}`],
        last_seen: new Date().toISOString()
      })
    
    return NextResponse.json({ certificate })
  } catch (error) {
    console.error('Certificate generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate PDF certificate
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { component_id, format = 'json' } = body
    
    if (!component_id) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 })
    }
    
    // For now, return the same JSON data
    // In production, this would generate a PDF
    const certificateResponse = await fetch(
      `${request.nextUrl.origin}/api/quality/certificate?component_id=${component_id}`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      }
    )
    
    if (!certificateResponse.ok) {
      return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 })
    }
    
    const { certificate } = await certificateResponse.json()
    
    if (format === 'pdf') {
      // In production, use a PDF library like jsPDF or puppeteer
      return NextResponse.json({ 
        message: 'PDF generation not implemented',
        certificate,
        downloadUrl: `/api/quality/certificate/download?id=${certificate.certificateId}`
      })
    }
    
    return NextResponse.json({ certificate })
  } catch (error) {
    console.error('Certificate generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}