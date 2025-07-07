#!/bin/bash

# Kimai Timesheet Extraction Scheduler
# This script sets up a cron job to automatically extract timesheets

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXTRACT_SCRIPT="$SCRIPT_DIR/kimai-extract-timesheets.js"
LOG_DIR="$SCRIPT_DIR/../logs"
LOG_FILE="$LOG_DIR/kimai-extract.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to add cron job
add_cron_job() {
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "kimai-extract-timesheets.js"; then
        echo "❌ Cron job already exists. Remove it first with: $0 remove"
        exit 1
    fi
    
    # Add cron job to run daily at 10 AM
    (crontab -l 2>/dev/null; echo "0 10 * * * cd $SCRIPT_DIR && /usr/bin/node $EXTRACT_SCRIPT >> $LOG_FILE 2>&1") | crontab -
    
    echo "✅ Cron job added successfully!"
    echo "   The script will run daily at 10:00 AM"
    echo "   Logs will be written to: $LOG_FILE"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep kimai
}

# Function to remove cron job
remove_cron_job() {
    # Remove the cron job
    crontab -l 2>/dev/null | grep -v "kimai-extract-timesheets.js" | crontab -
    echo "✅ Cron job removed successfully!"
}

# Function to show status
show_status() {
    echo "Kimai Extraction Scheduler Status"
    echo "================================="
    echo ""
    
    # Check if cron job exists
    if crontab -l 2>/dev/null | grep -q "kimai-extract-timesheets.js"; then
        echo "✅ Cron job is active:"
        crontab -l | grep kimai
    else
        echo "❌ No cron job found"
    fi
    
    echo ""
    echo "Log file: $LOG_FILE"
    
    # Show last few log entries if they exist
    if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "Recent log entries:"
        echo "------------------"
        tail -n 10 "$LOG_FILE"
    else
        echo "(No logs yet)"
    fi
}

# Function to run extraction manually
run_now() {
    echo "Running extraction manually..."
    cd "$SCRIPT_DIR"
    node "$EXTRACT_SCRIPT" --force
}

# Function to test extraction
test_extraction() {
    echo "Testing extraction (dry run)..."
    cd "$SCRIPT_DIR"
    
    # Get current period info
    node -e "
    require('dotenv').config();
    const { format, addDays, startOfDay } = require('date-fns');
    
    const payPeriodStart = new Date(process.env.PAY_PERIOD_START || '2024-01-01');
    const payPeriodDays = parseInt(process.env.PAY_PERIOD_DAYS || '14');
    const now = new Date();
    
    const daysSinceStart = Math.floor((now - payPeriodStart) / (1000 * 60 * 60 * 24));
    const currentPeriod = Math.floor(daysSinceStart / payPeriodDays);
    const periodStart = addDays(payPeriodStart, currentPeriod * payPeriodDays);
    const periodEnd = addDays(periodStart, payPeriodDays - 1);
    const daysElapsed = daysSinceStart % payPeriodDays + 1;
    
    console.log('Current Pay Period Info:');
    console.log('  Period #' + (currentPeriod + 1));
    console.log('  Dates: ' + format(periodStart, 'MMM dd') + ' - ' + format(periodEnd, 'MMM dd, yyyy'));
    console.log('  Days elapsed: ' + daysElapsed + ' of ' + payPeriodDays);
    console.log('  Extract after day: ' + (process.env.EXTRACT_AFTER_DAYS || '7'));
    console.log('');
    console.log('Next extraction will occur on day ' + (process.env.EXTRACT_AFTER_DAYS || '7') + ' of the pay period');
    "
}

# Main script logic
case "$1" in
    "add"|"install")
        add_cron_job
        ;;
    "remove"|"uninstall")
        remove_cron_job
        ;;
    "status")
        show_status
        ;;
    "run"|"now")
        run_now
        ;;
    "test")
        test_extraction
        ;;
    *)
        echo "Kimai Timesheet Extraction Scheduler"
        echo ""
        echo "Usage: $0 {add|remove|status|run|test}"
        echo ""
        echo "Commands:"
        echo "  add     - Add cron job to run extraction daily"
        echo "  remove  - Remove the cron job"
        echo "  status  - Show current scheduler status and recent logs"
        echo "  run     - Run extraction now (force)"
        echo "  test    - Test configuration and show current period info"
        echo ""
        echo "The extraction script will automatically run after the configured"
        echo "number of days (EXTRACT_AFTER_DAYS) into each pay period."
        ;;
esac