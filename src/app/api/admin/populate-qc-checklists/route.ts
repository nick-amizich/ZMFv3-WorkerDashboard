import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'

// Comprehensive checklist data organized by production step
const checklistData = {
  inventory_intake: [
    'Cup Count Verification: Ensure the number of cups received matches what was shipped.',
    'Grade Check: Confirm all cups are A stock, not B stock.',
    'Wood Type Validation: Check that the wood type matches the product that was sent or ordered.',
    'Matching Pairs: Verify that left and right cups and baffles are matched correctly for each unit.'
  ],
  sanding_pre_work: [
    'Left/Right Pairing: Ensure cups are paired correctly as left and right.',
    'Grade Check: Confirm all cups are A stock.',
    'Pre-Sanding Validation: For robot-sanded models, confirm pre-sanding was completed.',
    'Grille Fit Pre-Check: Ensure grilles fit properly before sanding begins.',
    'Drilling Completion: Verify gimbal and jack holes are drilled out.',
    'Wood Match: Check that the wood matches the work order.'
  ],
  sanding_post_work: [
    'Surface Smoothness: Check for uniform smoothness without gouges or unevenness.',
    'Shape Accuracy: Confirm shape consistency and compare against example pieces for that model.',
    'Edge Treatment: Ensure all edges are properly rounded or beveled as needed.',
    'Gimbal Fit: Confirm gimbals fit properly post-sanding.',
    'Grille Fit (if applicable): Re-check that grille fit remains correct after sanding.',
    'Pore Filler Application: Apply and confirm pore filler use where needed.'
  ],
  finishing_pre_work: [
    'Surface Smoothness: Check for uniform smoothness without gouges or unevenness.',
    'Shape Accuracy: Confirm shape consistency and compare against example pieces for that model.',
    'Edge Treatment: Ensure all edges are properly rounded or beveled as needed.',
    'Gimbal Fit: Confirm gimbals fit properly post-sanding.',
    'Grille Fit (if applicable): Re-check that grille fit remains correct after sanding.',
    'Pore Filler Application: Apply and confirm pore filler use where needed.'
  ],
  finishing_post_work: [
    'Slots Stained: Verify that slots are evenly and adequately stained.',
    'Bottom Rim Stained: Confirm that the bottom rim has received proper stain treatment.',
    'Buffed as Needed: Ensure final buffing has been completed where necessary.',
    'Finish Cleanliness: Confirm no niblets, hairs, or debris are present in the finish.',
    'A-Stock Confirmation: Check for any abnormalities that would disqualify the cup from being A-stock.'
  ],
  sub_assembly_chassis_pre_work: [
    'Stock Grade Verification: Confirm parts are A stock or B stock per the work order.',
    'Color Match: Ensure all components match the color specifications of the order.'
  ],
  sub_assembly_chassis_post_work: [
    'Component Fit: Ensure all parts align and fit snugly without force.',
    'Rod Installation: Confirm rods are inserted with the correct amount of force.',
    'Steel Band Alignment: Verify that the steel band is straight within the upright.',
    'Fastener Tightness: Verify all screws/bolts are torqued correctly.',
    'Thread Locking: Ensure screws are properly thread-locked or securely tightened.',
    'Screw Integrity: Check that no screws are stripped.'
  ],
  sub_assembly_baffle_pre_work: [
    'Driver Preparation: Ensure drivers are tested and labeled.',
    'Surface Quality: Confirm baffles are sanded and rounded properly.',
    'Finish Inspection: Ensure there are no sanding marks in incorrect areas.',
    'Hole Alignment: Check that baffle holes align properly with other components.'
  ],
  sub_assembly_baffle_post_work: [
    'Driver Seating: Confirm drivers are flush and secure in their mountings.',
    'Seal Integrity: Test for air-tight seal where required.',
    'Soldering Quality: Inspect solder joints for cleanliness and strength.',
    'Foam Matching: Ensure all foam is matched by weight as required.'
  ],
  final_production: [
    'Component Check: Ensure all sub-assemblies and hardware are ready and defect-free.',
    'Full Assembly Check: Verify all parts are installed in the correct order and orientation.',
    'Functional Test: Perform electrical and mechanical testing.',
    'Hardware Check: Confirm all external hardware is present and functional.',
    'Comfort Test: Inspect headband adjustment, clamp force, and padding.'
  ],
  final_assembly: [
    'Parts Verification: Ensure all parts match the assigned specs.',
    'Finish Check: Inspect the cup finish for quality.',
    'Grille Fit: Confirm grille fit and darken slots as needed.',
    'Component Grade: Ensure all parts meet the assigned quality grade.',
    'Set Screw Slots: Properly darkened and smooth.',
    'Icon Slots: Cleaned thoroughly, with no wood or debris remaining.',
    'Baffle Length: Does not extend past outer cup diameter.',
    'Steel Band Insertion: Set at 90° and correctly inserted.',
    'Fraying Check: No fraying present; trim any visible frays.',
    'Thread Securing: Use a heat gun briefly to shrink threads and secure leather ends.',
    'Baffle Screws: Confirm presence and correct installation.',
    'Gimbal Tension: Ensure even tension on both sides, with a premium feel and proper stability.',
    'Waxed O-Rings: Ensure no squeaking; apply guitar detailer if needed.',
    'Vibratite Application: Check bolts have vibratite applied; remove visible residue; confirm tightness with hex keys.',
    'Rod Adjustment: Perform click test for audible feedback and inspect visual congruence.',
    'Metal Finish: Check rods and metal components for marks, inconsistencies, and confirm symmetrical molded marks.',
    'Audio Test (Sonic Sweeps): Run sweeps with JDS Labs Element amp; confirm absence of buzzes or rattles.',
    'Audio Test (In Phase): Play stereo phase test and confirm accurate phase alignment.'
  ],
  acoustic_aesthetic_qc: [
    'Listening Test: Compare sound signature to a reference unit.',
    'Cosmetic Review: Check for blemishes, fingerprints, mismatched grain or finish.',
    'Measurement Test: Confirm measurements match acoustic standards.',
    'Listening Test Confirmation: Ensure no audible buzzes, rattles, or imperfections.',
    'Debris Check: Confirm headphone is free of debris.',
    'Headband Alignment: Verify headband is properly bent.',
    'Fit Test: Check headband tension for comfort and security.',
    'Rod Tension: Confirm rod tension is correct and consistent.',
    'Surface Cleanliness: Ensure no thread locker or touch-up paint is visible.',
    'Quality Standard: Confirm headphone meets the assigned quality standard.',
    'Headband Stamp: Ensure stamp is present on the headband.',
    'Spec Verification: Confirm all product specs are correct.'
  ],
  shipping: [
    'Cleaning: Wipe down all surfaces and polish metal and wood.',
    'Accessory Inclusion: Verify that all cables, cases, documentation, etc. are present.',
    'Packaging Inspection: Ensure all items are secured and protected for transit.',
    'Labeling and Tracking: Attach correct labels and confirm tracking system updates.',
    'Headband Bolts: Confirm secure installation and appropriate tightness.',
    'Finish Gimbal: Check finish on gimbals for consistency and cleanliness.',
    'Touchup O-Rings: Ensure O-rings are clean and free of cosmetic touch-up residue.',
    'Set-Screw: Confirm proper fit and darkening as required.',
    'Earpad Align: Ensure earpads are aligned properly.',
    'DUST: Check that all headphone surfaces are free of dust.',
    'Pre-Pack Confirmation: Confirm pre-pack checklist is complete and matches Shopify/listing records.'
  ]
}

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'User not authenticated')
      return response
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker?.is_active || worker.role !== 'manager') {
      const response = NextResponse.json({ error: 'Unauthorized - Manager role required' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'User not authorized as manager')
      return response
    }

    // Get all production steps from the database
    const { data: productionSteps, error: stepsError } = await supabase
      .from('qc_production_steps' as any)
      .select('value, label')
      .eq('is_active', true)
      .order('sort_order')

    if (stepsError) {
      console.error('Error fetching production steps:', stepsError)
      const response = NextResponse.json({ error: 'Failed to fetch production steps' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Error fetching production steps')
      return response
    }

    // Type assertion for the production steps
    const steps = (productionSteps as unknown) as Array<{ value: string; label: string }> || []

    // Clear existing checklist items
    const { error: deleteError } = await supabase
      .from('qc_checklist_items' as any)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error('Error clearing existing items:', deleteError)
      const response = NextResponse.json({ error: 'Failed to clear existing checklist items' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Error clearing existing items')
      return response
    }

    // Insert new checklist items for each production step
    let totalItemsInserted = 0
    const summary = []

    for (const step of steps) {
      const items = checklistData[step.value as keyof typeof checklistData]
      
      if (!items) {
        console.log(`No checklist items found for step: ${step.value} (${step.label})`)
        continue
      }

      const itemsToInsert = items.map((itemText: string, index: number) => ({
        production_step_value: step.value,
        item_text: itemText,
        sort_order: (index + 1) * 10, // 10, 20, 30, etc.
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('qc_checklist_items' as any)
        .insert(itemsToInsert as any)

      if (insertError) {
        console.error(`Error inserting items for ${step.value}:`, insertError)
        continue
      }

      totalItemsInserted += items.length
      summary.push({
        step: step.label,
        value: step.value,
        itemCount: items.length
      })
    }

    const response = NextResponse.json({ 
      success: true,
      message: `Successfully populated ${totalItemsInserted} checklist items across ${steps.length} production steps`,
      totalItems: totalItemsInserted,
      stepsProcessed: steps.length,
      summary
    })
    
    ApiLogger.logResponse(logContext, response, `Populated ${totalItemsInserted} QC checklist items`)
    return response

  } catch (error) {
    console.error('Error populating QC checklist items:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
} 