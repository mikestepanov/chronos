#!/bin/bash

# Quick test status check script
# Run this before committing to ensure tests pass

set -e

echo "🧪 Bot Test Status Check"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  Dependencies not installed. Running npm install...${NC}"
    npm install
    echo ""
fi

# Function to run a test and report status
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing $test_name... "
    
    if npm run $test_command --silent > /dev/null 2>&1; then
        echo "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Track overall status
all_passed=true

# Run critical tests
echo "Running critical tests:"
echo "---------------------"

run_test "Pay Period Calculator" "test:pay-period -- --silent" || all_passed=false
run_test "Monday Reminder Bot" "test:monday -- --silent" || all_passed=false
run_test "Resilient Sender" "test:resilient -- --silent" || all_passed=false

echo ""

# Check test coverage
echo "Checking test coverage:"
echo "----------------------"

if npm run test:coverage --silent > coverage-summary.txt 2>&1; then
    if grep -q "All files" coverage-summary.txt; then
        coverage_line=$(grep "All files" coverage-summary.txt | head -1)
        echo "Coverage: $coverage_line"
    fi
    rm -f coverage-summary.txt
else
    echo "${YELLOW}⚠️  Could not generate coverage report${NC}"
fi

echo ""

# Summary
if [ "$all_passed" = true ]; then
    echo "${GREEN}✅ All tests passed! Safe to commit.${NC}"
    exit 0
else
    echo "${RED}❌ Some tests failed. Please fix before committing.${NC}"
    echo ""
    echo "Run './run-tests.sh' for detailed test output"
    exit 1
fi