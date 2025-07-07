#!/bin/bash

# Kimai Test Runner
# Run all tests or specific test suites

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Kimai Test Suite Runner"
echo "=========================="
echo ""

# Check for test type argument
TEST_TYPE="${1:-all}"

run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    echo "---"
    
    if KIMAI_MOCK=true NODE_ENV=test node "$test_file"; then
        echo -e "${GREEN}✓ ${test_name} passed${NC}\n"
        return 0
    else
        echo -e "${RED}✗ ${test_name} failed${NC}\n"
        return 1
    fi
}

# Track failures
FAILED=0

case $TEST_TYPE in
    "mock")
        echo "Running mock tests (no API required)..."
        echo ""
        run_test "Mock Tests" "$SCRIPT_DIR/mock-test.js" || FAILED=$((FAILED + 1))
        ;;
    
    "integration")
        echo "Running integration tests (requires Kimai API)..."
        echo ""
        
        # Check if we have API credentials
        if [ -z "$KIMAI_API_KEY" ] && [ -z "$KIMAI_USERNAME" ]; then
            echo -e "${YELLOW}Warning: No Kimai credentials found in environment${NC}"
            echo "Set KIMAI_API_KEY or KIMAI_USERNAME/PASSWORD to run integration tests"
            echo ""
        fi
        
        run_test "Integration Tests" "$SCRIPT_DIR/integration-test.js" || FAILED=$((FAILED + 1))
        ;;
    
    "load")
        echo "Running load tests..."
        echo ""
        
        # Run with different user counts
        for users in 10 50 100; do
            echo -e "${YELLOW}Load test with ${users} users:${NC}"
            node "$SCRIPT_DIR/load-test-concurrent.js" $users || FAILED=$((FAILED + 1))
            echo ""
        done
        ;;
    
    "quick")
        echo "Running quick tests (mock only)..."
        echo ""
        run_test "Mock Tests" "$SCRIPT_DIR/mock-test.js" || FAILED=$((FAILED + 1))
        run_test "Pipeline Tests" "$SCRIPT_DIR/test-pipeline.js" || FAILED=$((FAILED + 1))
        ;;
    
    "all")
        echo "Running all tests..."
        echo ""
        
        # Run mock tests first (always work)
        run_test "Mock Tests" "$SCRIPT_DIR/mock-test.js" || FAILED=$((FAILED + 1))
        
        # Run pipeline tests
        run_test "Pipeline Tests" "$SCRIPT_DIR/test-pipeline.js" || FAILED=$((FAILED + 1))
        
        # Run integration tests if API available
        if [ -n "$KIMAI_API_KEY" ] || [ -n "$KIMAI_USERNAME" ]; then
            run_test "Integration Tests" "$SCRIPT_DIR/integration-test.js" || FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}Skipping integration tests (no API credentials)${NC}\n"
        fi
        
        # Run basic load test
        echo -e "${YELLOW}Running basic load test (10 users):${NC}"
        node "$SCRIPT_DIR/load-test-concurrent.js" 10 || FAILED=$((FAILED + 1))
        ;;
    
    *)
        echo "Usage: $0 [all|mock|integration|load|quick]"
        echo ""
        echo "Options:"
        echo "  all         - Run all tests (default)"
        echo "  mock        - Run only mock tests (no API needed)"
        echo "  integration - Run integration tests (requires API)"
        echo "  load        - Run load tests with various user counts"
        echo "  quick       - Run quick tests (mock + pipeline)"
        echo ""
        exit 1
        ;;
esac

echo ""
echo "=========================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ ${FAILED} test(s) failed${NC}"
    exit 1
fi