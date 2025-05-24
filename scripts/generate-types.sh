#!/bin/bash

# Script to generate TypeScript types from Supabase database
# This includes all tables including v3 quality system tables

PROJECT_ID="kjdicpudxqxenhjwdrzg"

echo "Generating TypeScript types from Supabase database..."
echo "Project ID: $PROJECT_ID"

# Generate types
npx supabase gen types typescript --project-id "$PROJECT_ID" > src/types/database.ts

echo "Types generated successfully at src/types/database.ts"
echo ""
echo "Note: If you see errors about missing tables like 'quality_patterns' or 'quality_holds',"
echo "make sure the v3 migrations have been applied to the database:"
echo ""
echo "  npx supabase db push"
echo ""