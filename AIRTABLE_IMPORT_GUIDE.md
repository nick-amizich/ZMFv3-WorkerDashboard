# Airtable Import Guide

## Overview
The Airtable import feature allows you to import CSV data from your Airtable exports into the machine shop database. This is designed to help migrate your existing data into the new system.

## Access
1. Navigate to the South location dashboard
2. Click on "Import Data" in the navigation menu or use the quick action button
3. Must be logged in as a manager to access this feature

## Available Tables

### One-Time Imports (Run once during initial setup)
1. **Parts Catalog** (`Random Task Inc Parts Data.csv`)
   - Imports machine shop parts specifications and settings
   - Maps to `parts_catalog` table
   - Contains part names, types, CNC settings, and specifications

2. **Wood Inventory** (`Wood Inventory Grid View.csv`)
   - Imports current wood stock levels and specifications
   - Maps to `wood_inventory` table
   - Contains species, quantities, locations, and quality info

### Recurring Imports (Can be run multiple times)
3. **Open Part Requests** (`Open Part Requests.csv`)
   - Imports active production requests and orders
   - Maps to `production_requests` table
   - Contains request details, quantities, and status

## How to Use

1. **Select Tables**
   - Check the boxes next to the tables you want to import
   - One-time imports should only be run during initial setup

2. **Clear Existing Data (Optional)**
   - Check "Clear existing data before import" if you want to replace all existing records
   - ⚠️ WARNING: This will permanently delete existing data in the selected tables

3. **Import**
   - Click "Import Selected Tables"
   - The system will process each CSV file and import the data
   - Progress and results will be shown for each table

## Data Mapping

### Parts Catalog
- Part names and types are imported directly
- Part types are validated against allowed values (cup, baffle, driver_mount, connector, other)
- CNC settings and specifications are stored as JSON
- Parts marked as "Make it!" are set as active

### Wood Inventory
- Species and quantities are imported directly
- Additional details (form, size, location, thickness, quality) are stored in notes field
- Original Airtable IDs are preserved for reference

### Production Requests
- Attempts to match part names with existing parts in the catalog
- Calculates status based on quantities (completed vs ordered)
- Preserves original Airtable IDs and timestamps in notes

## Future Imports
The following CSV files are available for future implementation:
- `Open Part Requests Daily Update.csv` - For daily production updates
- `Random Task Inc Daily Update Full Table.csv` - For comprehensive daily updates
- `Machining Issues Grid View.csv` - For tracking production issues

## Troubleshooting
- Ensure CSV files are in the correct format (UTF-8 with headers)
- Check that you have manager permissions
- Review import results for any errors
- Check logs at `/manager/logs` for detailed error information