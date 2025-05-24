#!/bin/bash

# ZMF Worker Dashboard - Bug Scanner Script
# This script scans the codebase for known issues

echo "🔍 ZMF Worker Dashboard - Bug Scanner"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bug counters
BUG_COUNT=0
WARNING_COUNT=0

# Function to report bugs
report_bug() {
    echo -e "${RED}❌ BUG:${NC} $1"
    echo "   File: $2"
    echo "   Line: $3"
    echo ""
    ((BUG_COUNT++))
}

# Function to report warnings
report_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
    echo "   File: $2"
    echo ""
    ((WARNING_COUNT++))
}

echo -e "${BLUE}1. Checking for employee_id bug...${NC}"
echo "----------------------------------------"
EMPLOYEE_ID_FILES=$(grep -r "employee_id" src/app/api --include="*.ts" --include="*.tsx" 2>/dev/null)
if [ ! -z "$EMPLOYEE_ID_FILES" ]; then
    while IFS= read -r line; do
        FILE=$(echo "$line" | cut -d: -f1)
        LINE_NUM=$(grep -n "employee_id" "$FILE" | cut -d: -f1 | head -1)
        report_bug "Database query uses 'employee_id' instead of 'id'" "$FILE" "$LINE_NUM"
    done <<< "$EMPLOYEE_ID_FILES"
else
    echo -e "${GREEN}✅ No employee_id issues found${NC}"
fi
echo ""

echo -e "${BLUE}2. Checking for empty Select values...${NC}"
echo "----------------------------------------"
# Check for empty string values in Select components
EMPTY_SELECT=$(grep -r 'value=""' src --include="*.tsx" 2>/dev/null | grep -i select)
if [ ! -z "$EMPTY_SELECT" ]; then
    while IFS= read -r line; do
        FILE=$(echo "$line" | cut -d: -f1)
        report_bug "Select component has empty string value (causes React error)" "$FILE" ""
    done <<< "$EMPTY_SELECT"
else
    echo -e "${GREEN}✅ No empty Select values found${NC}"
fi
echo ""

echo -e "${BLUE}3. Checking for missing TypeScript types...${NC}"
echo "----------------------------------------"
# Check for 'any' types
ANY_TYPES=$(grep -r ": any" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l)
if [ $ANY_TYPES -gt 10 ]; then
    report_warning "Found $ANY_TYPES uses of 'any' type - consider adding proper types" "Multiple files"
else
    echo -e "${GREEN}✅ Minimal use of 'any' types${NC}"
fi
echo ""

echo -e "${BLUE}4. Checking for console.log statements...${NC}"
echo "----------------------------------------"
CONSOLE_LOGS=$(grep -r "console\." src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "console.error" | wc -l)
if [ $CONSOLE_LOGS -gt 5 ]; then
    report_warning "Found $CONSOLE_LOGS console statements - remove before production" "Multiple files"
else
    echo -e "${GREEN}✅ Minimal console usage${NC}"
fi
echo ""

echo -e "${BLUE}5. Checking for TODO comments...${NC}"
echo "----------------------------------------"
TODO_COUNT=$(grep -r "TODO" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    report_warning "Found $TODO_COUNT TODO comments - review before production" "Multiple files"
else
    echo -e "${GREEN}✅ No TODO comments found${NC}"
fi
echo ""

echo -e "${BLUE}6. Checking for hardcoded API keys...${NC}"
echo "----------------------------------------"
# Check for potential API keys
API_KEYS=$(grep -r "api[_-]key\|apiKey\|API_KEY" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "process.env" | grep -v "import")
if [ ! -z "$API_KEYS" ]; then
    report_bug "Potential hardcoded API key found" "Check grep output" ""
else
    echo -e "${GREEN}✅ No hardcoded API keys found${NC}"
fi
echo ""

echo -e "${BLUE}7. Checking database queries...${NC}"
echo "----------------------------------------"
# Check for potential SQL injection
RAW_SQL=$(grep -r "supabase.rpc\|raw(" src --include="*.ts" --include="*.tsx" 2>/dev/null)
if [ ! -z "$RAW_SQL" ]; then
    report_warning "Raw SQL queries found - ensure proper sanitization" "Multiple files"
else
    echo -e "${GREEN}✅ No raw SQL queries found${NC}"
fi
echo ""

echo -e "${BLUE}8. Checking for missing error handling...${NC}"
echo "----------------------------------------"
# Check for fetch without catch
FETCH_NO_CATCH=$(grep -A2 -B2 "fetch(" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "catch" | grep -c "fetch(")
if [ $FETCH_NO_CATCH -gt 5 ]; then
    report_warning "Found fetch calls without proper error handling" "Multiple files"
fi
echo ""

echo -e "${BLUE}9. Checking for React issues...${NC}"
echo "----------------------------------------"
# Check for missing key props
MAP_NO_KEY=$(grep -r "\.map(" src --include="*.tsx" 2>/dev/null | grep -v "key=" | wc -l)
if [ $MAP_NO_KEY -gt 10 ]; then
    report_warning "Found map() calls that might be missing key props" "Multiple files"
fi
echo ""

echo -e "${BLUE}10. Checking for performance issues...${NC}"
echo "----------------------------------------"
# Check for large bundle imports
LARGE_IMPORTS=$(grep -r "import \* as" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ $LARGE_IMPORTS -gt 5 ]; then
    report_warning "Found $LARGE_IMPORTS wildcard imports - consider specific imports" "Multiple files"
fi
echo ""

# Summary
echo "====================================="
echo "📊 SCAN SUMMARY"
echo "====================================="
echo -e "${RED}Bugs found: $BUG_COUNT${NC}"
echo -e "${YELLOW}Warnings: $WARNING_COUNT${NC}"
echo ""

if [ $BUG_COUNT -gt 0 ]; then
    echo "🛠️  RECOMMENDED FIXES:"
    echo "1. Replace all 'employee_id' with 'id' in workers table queries"
    echo "2. Replace empty string values in Select components with 'none'"
    echo "3. Add proper error handling to all API calls"
    echo "4. Review and fix any TypeScript type issues"
else
    echo -e "${GREEN}✨ No critical bugs found!${NC}"
fi

# Check if migrations need to be run
echo ""
echo -e "${BLUE}Checking database status...${NC}"
if [ -f "supabase/migrations/20250130_v3_automation_rules.sql" ]; then
    echo -e "${YELLOW}⚠️  V3 migrations exist - make sure to run: npx supabase db push${NC}"
fi

exit $BUG_COUNT