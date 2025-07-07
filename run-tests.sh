#!/bin/bash

# Bot Testing Script
# Run various test suites with helpful output

set -e  # Exit on error

echo "🧪 Bot Testing Suite"
echo "==================="
echo ""

# Check if Jest is installed
if ! command -v jest &> /dev/null && ! npx jest --version &> /dev/null; then
    echo "❌ Jest not found. Installing dependencies..."
    npm install
    echo ""
fi

# Function to run a test suite
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo "📋 Running: $test_name"
    echo "-------------------"
    
    if npm run $test_command; then
        echo "✅ $test_name passed!"
    else
        echo "❌ $test_name failed!"
        exit 1
    fi
    echo ""
}

# Parse command line arguments
case "$1" in
    "unit")
        echo "Running unit tests only..."
        run_test "Unit Tests" "test:unit"
        ;;
    "integration")
        echo "Running integration tests only..."
        run_test "Integration Tests" "test:integration"
        ;;
    "pay-period")
        echo "Running pay period calculator tests..."
        run_test "Pay Period Tests" "test:pay-period"
        ;;
    "monday")
        echo "Running Monday reminder tests..."
        run_test "Monday Reminder Tests" "test:monday"
        ;;
    "resilient")
        echo "Running resilient sender tests..."
        run_test "Resilient Sender Tests" "test:resilient"
        ;;
    "security")
        echo "Running security tests..."
        run_test "Security Tests" "test:security"
        ;;
    "kimai")
        echo "Running Kimai client tests..."
        run_test "Kimai Client Tests" "test:kimai"
        ;;
    "storage")
        echo "Running storage layer tests..."
        run_test "Storage Layer Tests" "test:storage"
        ;;
    "webhook")
        echo "Running webhook handler tests..."
        run_test "Webhook Handler Tests" "test:webhook"
        ;;
    "flow")
        echo "Running integration flow tests..."
        run_test "Integration Flow Tests" "test:flow"
        ;;
    "critical")
        echo "Running all critical component tests..."
        run_test "Critical Components" "test:critical"
        ;;
    "coverage")
        echo "Running all tests with coverage..."
        npm run test:coverage
        echo ""
        echo "📊 Coverage report generated in ./coverage"
        ;;
    "watch")
        echo "Starting test watcher..."
        npm run test:watch
        ;;
    "quick")
        # Quick smoke test - just the critical components
        echo "Running quick smoke tests..."
        run_test "Pay Period Calculator" "test:pay-period -- --testNamePattern='should calculate current period correctly|should identify last day of period correctly'"
        run_test "Monday Reminder" "test:monday -- --testNamePattern='should send reminders on last day of period'"
        ;;
    *)
        # Run all tests
        echo "Running all tests..."
        echo ""
        
        # Run unit tests first (faster)
        run_test "Unit Tests" "test:unit"
        
        # Then integration tests
        if [ -d "tests/integration" ] && [ -n "$(ls -A tests/integration 2>/dev/null)" ]; then
            run_test "Integration Tests" "test:integration"
        fi
        
        # Summary
        echo "🎉 All tests passed!"
        echo ""
        echo "Run with 'coverage' to see test coverage"
        echo "Run with 'watch' for development mode"
        ;;
esac

# Show test tips
if [ "$1" != "watch" ]; then
    echo ""
    echo "💡 Test Tips:"
    echo "  ./run-tests.sh          # Run all tests"
    echo "  ./run-tests.sh unit     # Run unit tests only"
    echo "  ./run-tests.sh security # Run security tests"
    echo "  ./run-tests.sh critical # Run critical component tests"
    echo "  ./run-tests.sh coverage # Generate coverage report"
    echo "  ./run-tests.sh watch    # Watch mode for development"
    echo "  ./run-tests.sh quick    # Quick smoke test"
fi