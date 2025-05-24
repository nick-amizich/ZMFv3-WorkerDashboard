import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    const url = new URL(request.url)
    const sampleType = url.searchParams.get('sample_type') || 'default'
    const batchSize = parseInt(url.searchParams.get('batch_size') || '5')
    
    // Get the workflow template
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (workflowError || !workflow) {
      return NextResponse.json({ 
        error: 'Workflow template not found' 
      }, { status: 404 })
    }
    
    // Get sample workers for each stage
    const { data: workers } = await supabase
      .from('workers')
      .select('id, name, skills')
      .eq('is_active', true)
      .limit(20)
    
    // Generate sample data based on workflow stages
    const stages = workflow.stages as any[]
    const transitions = workflow.stage_transitions as any[]
    
    // Create preview stages with estimated execution flow
    const previewStages = stages.map((stage, index) => {
      // Find workers skilled for this stage
      const skilledWorkers = workers?.filter(w => 
        w.skills?.includes(stage.stage) || 
        w.skills?.includes('all_stages') ||
        stage.stage === 'packaging' || stage.stage === 'shipping' // These often don't require specific skills
      ) || []
      
      // Calculate estimated timing
      const estimatedHours = stage.estimated_hours || 2
      const parallelCapacity = Math.min(skilledWorkers.length, batchSize)
      const estimatedDuration = parallelCapacity > 0 ? 
        Math.ceil(batchSize / parallelCapacity) * estimatedHours : 
        estimatedHours
      
      // Find possible next stages
      const possibleNextStages = transitions
        .filter(t => t.from_stage === stage.stage)
        .flatMap(t => Array.isArray(t.to_stage) ? t.to_stage : [t.to_stage])
      
      return {
        stage_code: stage.stage,
        stage_name: stage.name || stage.stage,
        description: stage.description || `${stage.name || stage.stage} processing`,
        estimated_hours_per_item: estimatedHours,
        estimated_total_duration: estimatedDuration,
        automation_type: stage.is_automated ? 'automated' : 'manual',
        assignment_rule: stage.auto_assign_rule || 'manual',
        available_workers: skilledWorkers.length,
        sample_workers: skilledWorkers.slice(0, 3).map(w => ({
          id: w.id,
          name: w.name
        })),
        batch_capacity: parallelCapacity,
        next_stages: possibleNextStages,
        dependencies: index > 0 ? [stages[index - 1].stage] : [],
        is_optional: stage.is_optional || false
      }
    })
    
    // Calculate total workflow statistics
    const totalEstimatedHours = previewStages.reduce((sum, stage) => 
      sum + stage.estimated_total_duration, 0
    )
    
    const automatedStages = previewStages.filter(s => s.automation_type === 'automated').length
    const manualStages = previewStages.filter(s => s.automation_type === 'manual').length
    
    // Generate sample execution timeline
    const sampleTimeline = generateSampleTimeline(previewStages, batchSize)
    
    // Create sample batch data
    const sampleBatch = {
      id: 'preview-batch-' + Date.now(),
      name: `Sample ${sampleType} Batch`,
      batch_type: sampleType,
      item_count: batchSize,
      estimated_completion: new Date(Date.now() + totalEstimatedHours * 60 * 60 * 1000).toISOString(),
      sample_items: generateSampleItems(sampleType, batchSize)
    }
    
    const preview = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger_rules: workflow.trigger_rules
      },
      sample_batch: sampleBatch,
      stages: previewStages,
      statistics: {
        total_stages: previewStages.length,
        automated_stages: automatedStages,
        manual_stages: manualStages,
        estimated_total_hours: totalEstimatedHours,
        automation_percentage: Math.round((automatedStages / previewStages.length) * 100),
        parallel_efficiency: Math.round(
          (previewStages.reduce((sum, s) => sum + s.batch_capacity, 0) / previewStages.length) * 10
        ) / 10
      },
      timeline: sampleTimeline,
      recommendations: generateRecommendations(previewStages, workflow),
      generated_at: new Date().toISOString()
    }
    
    return NextResponse.json(preview)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSampleTimeline(stages: any[], batchSize: number) {
  const timeline = []
  let currentTime = new Date()
  
  for (const stage of stages) {
    const stageStart = new Date(currentTime)
    const stageEnd = new Date(currentTime.getTime() + stage.estimated_total_duration * 60 * 60 * 1000)
    
    timeline.push({
      stage: stage.stage_code,
      stage_name: stage.stage_name,
      start_time: stageStart.toISOString(),
      end_time: stageEnd.toISOString(),
      duration_hours: stage.estimated_total_duration,
      automation_type: stage.automation_type,
      worker_capacity: stage.batch_capacity
    })
    
    currentTime = stageEnd
  }
  
  return timeline
}

function generateSampleItems(sampleType: string, count: number) {
  const sampleItems = []
  
  for (let i = 1; i <= count; i++) {
    sampleItems.push({
      id: `sample-item-${i}`,
      product_name: getSampleProductName(sampleType, i),
      sku: `SAMPLE-${sampleType.toUpperCase()}-${String(i).padStart(3, '0')}`,
      quantity: 1,
      estimated_value: Math.round((Math.random() * 500 + 200) * 100) / 100
    })
  }
  
  return sampleItems
}

function getSampleProductName(sampleType: string, index: number) {
  const productTypes = {
    default: ['HD650 Headphones', 'HD800 Headphones', 'Verite Headphones'],
    walnut: ['Walnut HD650', 'Walnut Verite', 'Walnut Auteur'],
    ebony: ['Ebony HD800', 'Ebony Verite', 'Ebony Auteur'],
    limited: ['Limited Edition Verite', 'Special Walnut HD650', 'Anniversary Edition']
  }
  
  const products = productTypes[sampleType as keyof typeof productTypes] || productTypes.default
  return products[index % products.length]
}

function generateRecommendations(stages: any[], workflow: any) {
  const recommendations = []
  
  // Check for bottlenecks
  const bottlenecks = stages.filter(s => s.available_workers < 2)
  if (bottlenecks.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Potential Bottlenecks',
      message: `${bottlenecks.length} stages have limited worker availability`,
      stages: bottlenecks.map(s => s.stage_code)
    })
  }
  
  // Check automation opportunities
  const manualStages = stages.filter(s => s.automation_type === 'manual')
  if (manualStages.length > stages.length * 0.7) {
    recommendations.push({
      type: 'suggestion',
      title: 'Automation Opportunity',
      message: 'Consider automating more stages to improve efficiency',
      suggestion: 'Review assignment rules for manual stages'
    })
  }
  
  // Check for unbalanced stages
  const avgDuration = stages.reduce((sum, s) => sum + s.estimated_total_duration, 0) / stages.length
  const slowStages = stages.filter(s => s.estimated_total_duration > avgDuration * 1.5)
  if (slowStages.length > 0) {
    recommendations.push({
      type: 'optimization',
      title: 'Duration Imbalance',
      message: 'Some stages take significantly longer than others',
      suggestion: 'Consider splitting long stages or adding more workers'
    })
  }
  
  return recommendations
} 