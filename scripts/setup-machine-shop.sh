#!/bin/bash

echo "🏭 Setting up ZMF-South Machine Shop"
echo "===================================="

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
echo "🗄️  Applying machine shop database migration..."
echo "This will create:"
echo "  - parts_catalog table"
echo "  - machines table"
echo "  - machine_settings table"
echo "  - wood_inventory table"
echo "  - production_requests table"
echo "  - daily_production table"
echo "  - machining_issues table"
echo "  - And supporting tables and views"
echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migration..."
    npx supabase db push
    
    echo ""
    echo "🧪 Testing machine shop setup..."
    node scripts/test-machine-shop-setup.js
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   npm run dev"
    echo ""
    echo "2. Navigate to the South office dashboard:"
    echo "   http://localhost:3000/south"
    echo ""
    echo "3. Begin adding:"
    echo "   - Parts in the Parts Catalog"
    echo "   - Wood materials in Inventory"
    echo "   - Production requests"
    echo "   - Machine configurations"
    echo ""
    echo "4. For production deployment, set environment variables:"
    echo "   NEXT_PUBLIC_LOCATION_CODE=south"
    echo "   NEXT_PUBLIC_LOCATION_NAME=South Office - Machine Shop"
    echo "   NEXT_PUBLIC_APP_NAME=ZMF South - Machine Shop"
else
    echo "Migration cancelled"
fi