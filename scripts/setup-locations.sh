#!/bin/bash

echo "🚀 Setting up ZMF-South Location Support"
echo "========================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

echo ""
echo "📦 Installing dependencies if needed..."
npm install

echo ""
echo "🗄️  Applying database migration..."
echo "This will create:"
echo "  - locations table"
echo "  - facility_transfers table"
echo "  - Location fields on existing tables"
echo "  - Location-aware RLS policies"
echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migration..."
    npx supabase db push
    
    echo ""
    echo "🧪 Testing location setup..."
    node scripts/test-location-setup.js
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with location settings:"
    echo "   NEXT_PUBLIC_LOCATION_CODE=north"
    echo "   NEXT_PUBLIC_LOCATION_NAME=North Office - Assembly"
    echo ""
    echo "2. For South deployment, use:"
    echo "   NEXT_PUBLIC_LOCATION_CODE=south"
    echo "   NEXT_PUBLIC_LOCATION_NAME=South Office - Machine Shop"
    echo ""
    echo "3. Run 'npm run dev' to test locally"
else
    echo "Migration cancelled"
fi