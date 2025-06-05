import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logError, logBusiness } from '@/lib/logger'
import { parse } from 'csv-parse/sync'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized access attempt')
      return response
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker || worker.role !== 'manager') {
      const response = NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Non-manager attempted import')
      return response
    }

    const { tableName, clearExisting = false } = await request.json()

    // Map table names to CSV files and database tables
    const tableMapping: Record<string, { csvFile: string, dbTable: string, processor: Function }> = {
      'parts_catalog': {
        csvFile: 'Random Task Inc Parts Data.csv',
        dbTable: 'parts_catalog',
        processor: processPartsData
      },
      'wood_inventory': {
        csvFile: 'Wood Inventory Grid View.csv',
        dbTable: 'wood_inventory',
        processor: processWoodInventory
      },
      'production_requests': {
        csvFile: 'Open Part Requests.csv',
        dbTable: 'production_requests',
        processor: processProductionRequests
      }
    }

    const mapping = tableMapping[tableName]
    if (!mapping) {
      const response = NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Invalid table name provided')
      return response
    }

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'specs', 'airtable-csv', mapping.csvFile)
    const csvContent = await readFile(csvPath, 'utf-8')
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true // Handle UTF-8 BOM
    })

    // Clear existing data if requested
    if (clearExisting) {
      await supabase.from(mapping.dbTable).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      logBusiness(`Cleared existing data from ${mapping.dbTable}`, 'DATABASE', { tableName })
    }

    // Process and insert data
    const processedData = await mapping.processor(records, supabase)
    
    if (processedData.length > 0) {
      const { error: insertError } = await supabase
        .from(mapping.dbTable)
        .insert(processedData)

      if (insertError) {
        throw new Error(`Failed to insert data: ${insertError.message}`)
      }
    }

    logBusiness(`Imported ${processedData.length} records into ${mapping.dbTable}`, 'DATABASE', { 
      tableName,
      recordCount: processedData.length,
      importedBy: user.id
    })

    const response = NextResponse.json({ 
      success: true, 
      recordsImported: processedData.length,
      table: mapping.dbTable
    })
    ApiLogger.logResponse(logContext, response, 'Airtable data imported successfully')
    return response

  } catch (error) {
    logError(error as Error, 'API_ERROR', { 
      endpoint: '/api/south/import-airtable',
      method: 'POST'
    })
    const response = NextResponse.json({ 
      error: 'Failed to import data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
    ApiLogger.logResponse(logContext, response, 'Import failed')
    return response
  }
}

// Process parts catalog data
async function processPartsData(records: any[], supabase: any) {
  const processedData = []
  
  for (const record of records) {
    if (!record['Part Name'] || record['Part Name'].trim() === '') continue
    
    const partType = record['partType']?.toLowerCase() || 'other'
    const validTypes = ['cup', 'baffle', 'driver_mount', 'connector', 'other']
    
    processedData.push({
      part_name: record['Part Name'],
      part_type: validTypes.includes(partType) ? partType : 'other',
      specifications: {
        part_od: record['Part OD'],
        part_id: record['Part ID'],
        cnc_part_1: record['CNC Part 1'],
        cnc_part_2: record['CNC Part 2'],
        work_offset_part_1: record['Work Offset Part 1'],
        work_offset_part_2: record['Work Offset Part 2'],
        has_left_and_right: record['Has Left and Right'],
        min_stock_height: record['minStockHeight'],
        max_stock_height: record['maxStockHeight'],
        machining_qc: record['Machining QC'],
        part_status: record['Part Status']
      },
      is_active: record['Part Status'] === 'Make it!'
    })
  }
  
  return processedData
}

// Process wood inventory data
async function processWoodInventory(records: any[], supabase: any) {
  const processedData = []
  
  for (const record of records) {
    if (!record['Wood Species'] || record['Wood Species'].trim() === '') continue
    
    const quantity = parseInt(record['Qty']) || 0
    
    processedData.push({
      species: record['Wood Species'],
      quantity_in_stock: quantity,
      notes: JSON.stringify({
        wood_form: record['Wood Form'],
        size: record['Size'],
        location: record['Location'],
        thickness: record['Thickness'],
        quality: record['Wood Quality'],
        robot_ready: record['Robot Ready'],
        barcode: record['Barcode'],
        original_id: record['ID']
      })
    })
  }
  
  return processedData
}

// Process production requests data
async function processProductionRequests(records: any[], supabase: any) {
  const processedData = []
  
  // First, get all parts to match by name
  const { data: parts } = await supabase
    .from('parts_catalog')
    .select('id, part_name')
  
  const partsMap = new Map(parts?.map((p: any) => [p.part_name, p.id]) || [])
  
  for (const record of records) {
    if (!record['Monday Part Request'] || record['Request Status'] !== 'Open') continue
    
    // Monday Part Request is the product name
    const productName = record['Monday Part Request']
    
    // Try to find a matching part in the catalog
    // The product name might be in format like "Portable Baffles" (plural) or "Atrium Open"
    // We need to match intelligently - "Portable Baffles" should match "Portable Baffle" but not necessarily left/right
    let partId = null
    let bestMatch = null
    let bestMatchScore = 0
    
    // Normalize the product name for matching
    const normalizedProduct = productName.toLowerCase()
      .replace(/s$/, '') // Remove trailing 's' for plurals
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
    
    for (const [partName, id] of partsMap) {
      const normalizedPart = partName.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
      
      // Skip left/right specific parts unless exact match
      if ((normalizedPart.includes(' left') || normalizedPart.includes(' right')) && 
          !normalizedProduct.includes(' left') && !normalizedProduct.includes(' right')) {
        continue
      }
      
      // Calculate match score
      let score = 0
      
      // Exact match (highest priority)
      if (normalizedProduct === normalizedPart) {
        score = 100
      }
      // Product contains part name
      else if (normalizedProduct.includes(normalizedPart)) {
        score = 80
      }
      // Part contains product name
      else if (normalizedPart.includes(normalizedProduct)) {
        score = 70
      }
      // Partial word matching
      else {
        const productWords = normalizedProduct.split(' ')
        const partWords = normalizedPart.split(' ')
        const matchingWords = productWords.filter(pw => 
          partWords.some(ptw => ptw.includes(pw) || pw.includes(ptw))
        )
        score = (matchingWords.length / Math.max(productWords.length, partWords.length)) * 60
      }
      
      if (score > bestMatchScore) {
        bestMatchScore = score
        bestMatch = id
      }
    }
    
    // Only use match if confidence is high enough
    partId = bestMatchScore >= 50 ? bestMatch : null
    
    // Log matching result for debugging
    if (partId) {
      const matchedPartName = Array.from(partsMap.entries()).find(([_, id]) => id === partId)?.[0]
      console.log(`Matched "${productName}" to "${matchedPartName}" with score ${bestMatchScore}`)
    } else {
      console.log(`No match found for "${productName}" (best score: ${bestMatchScore})`)
    }
    
    const qtyOrdered = parseInt(record['Qty On Order']) || 0
    const qtyCompleted = parseInt(record['Qty Completed']) || 0
    
    // Calculate pricing based on Part Type
    const partType = record['Part Type']
    let unitPrice = null
    if (partType === 'Baffles') unitPrice = 20.00
    else if (partType === 'Cups') unitPrice = 40.00
    else if (partType === 'Stands') unitPrice = 25.00
    
    processedData.push({
      request_number: record['Request ID'] || `PR-${Date.now()}`,
      customer_name: 'Random Task Inc', // Default customer
      part_id: partId || null,
      quantity_ordered: qtyOrdered,
      quantity_completed: qtyCompleted,
      due_date: new Date().toISOString().split('T')[0], // Default to today
      priority: 'normal',
      status: qtyCompleted >= qtyOrdered ? 'completed' : 'in_production',
      unit_price: unitPrice,
      notes: JSON.stringify({
        product_name: productName, // Store the original Monday Part Request name
        material: record['Material'],
        part_type: record['Part Type'],
        remaining_hours: record['Remaining Manufacturing Time (Hours)'],
        pricing_info: record['Pricing'],
        airtable_id: record['AirtableID'],
        created: record['Created'],
        last_modified: record['Last Modified Time'],
        daily_updates: record['Daily Update'] ? [record['Daily Update']] : [],
        // Check if this is likely a combined left/right order
        includes_left_right: partType === 'Baffles' || partType === 'Cups' || 
                           productName.toLowerCase().includes('baffle') ||
                           productName.toLowerCase().includes('cup')
      })
    })
  }
  
  return processedData
}

// GET endpoint to check available tables
export async function GET(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized access attempt')
      return response
    }

    const availableTables = [
      {
        name: 'parts_catalog',
        displayName: 'Parts Catalog',
        description: 'Machine shop parts specifications and settings',
        csvFile: 'Random Task Inc Parts Data.csv',
        oneTime: true
      },
      {
        name: 'wood_inventory',
        displayName: 'Wood Inventory',
        description: 'Current wood stock levels and specifications',
        csvFile: 'Wood Inventory Grid View.csv',
        oneTime: true
      },
      {
        name: 'production_requests',
        displayName: 'Open Part Requests',
        description: 'Active production requests and orders',
        csvFile: 'Open Part Requests.csv',
        oneTime: false // Can be re-imported
      }
    ]

    const response = NextResponse.json({ tables: availableTables })
    ApiLogger.logResponse(logContext, response, 'Available tables retrieved')
    return response

  } catch (error) {
    logError(error as Error, 'API_ERROR', { 
      endpoint: '/api/south/import-airtable',
      method: 'GET'
    })
    const response = NextResponse.json({ error: 'Failed to get available tables' }, { status: 500 })
    ApiLogger.logResponse(logContext, response, 'Failed to get tables')
    return response
  }
}