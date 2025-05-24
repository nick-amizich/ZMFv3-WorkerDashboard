import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Simple QR code generation using text-based approach
// In production, use a proper QR library like 'qrcode'
function generateQRCodeSVG(data: string): string {
  // This is a placeholder - in production use a real QR library
  const size = 200
  const padding = 20
  
  // Create a simple SVG with the data encoded
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="white"/>
      <rect x="${padding}" y="${padding}" width="${size - 2 * padding}" height="${size - 2 * padding}" fill="black"/>
      <rect x="${padding + 10}" y="${padding + 10}" width="${size - 2 * padding - 20}" height="${size - 2 * padding - 20}" fill="white"/>
      <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="10" fill="black">
        ${data.substring(0, 20)}
      </text>
      <text x="${size/2}" y="${size/2 + 15}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="8" fill="black">
        QR Code
      </text>
    </svg>
  `
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate employee status
    const { data: employee } = await supabase
      .from('employees')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { component_id, left_serial, right_serial } = body
    
    if (!component_id || !left_serial || !right_serial) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Create QR data with component info
    const qrData = JSON.stringify({
      id: component_id,
      l: left_serial,
      r: right_serial,
      t: Date.now()
    })
    
    // Generate QR code SVG
    const svgContent = generateQRCodeSVG(qrData)
    
    // Convert SVG to PNG would happen here in production
    // For now, return the SVG as a blob
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="QR_${left_serial}.svg"`
      }
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Scan/decode QR code
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { qr_data } = body
    
    if (!qr_data) {
      return NextResponse.json({ 
        error: 'QR data is required' 
      }, { status: 400 })
    }
    
    try {
      // Parse QR data
      const data = JSON.parse(qr_data)
      
      // Look up component
      const { data: component, error } = await supabase
        .from('component_tracking')
        .select('*')
        .eq('id', data.id)
        .single()
      
      if (error) throw error
      
      return NextResponse.json({
        success: true,
        component
      })
      
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid QR code format' 
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}