import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { component_id, left_serial, right_serial } = body
    
    if (!component_id || !left_serial || !right_serial) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Generate QR code data
    const qrData = JSON.stringify({
      id: component_id,
      left: left_serial,
      right: right_serial,
      generated: new Date().toISOString()
    })
    
    try {
      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      // Return as image
      return new NextResponse(qrBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="QR_${left_serial}.png"`
        }
      })
      
    } catch (qrError) {
      console.error('QR Generation Error:', qrError)
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('QR API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}