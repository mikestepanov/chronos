# Kimai Pipeline Testing Guide

## Test Suite Overview

The test suite ensures the pipeline handles real-world scenarios correctly:

1. **Concurrent Requests** - Multiple users saying "done" simultaneously
2. **Queue Management** - Deduplication and caching
3. **Error Handling** - Network failures, invalid data
4. **Version Control** - Git commits and history
5. **Load Testing** - Stress testing with many users

## Running Tests

### 1. Basic Pipeline Test
```bash
cd scripts/kimai/tests
node test-pipeline.js
```

This tests:
- Basic extraction functionality
- Concurrent request handling
- Queue debouncing (30-second cache)
- Error scenarios
- Storage versioning
- Git integration (if enabled)

### 2. Load Test
```bash
# Test with 10 concurrent users (default)
node load-test-concurrent.js

# Test with 50 concurrent users
node load-test-concurrent.js 50

# Test with 100 concurrent users
node load-test-concurrent.js 100
```

This simulates:
- N users sending "@bot done" at the exact same time
- Staggered requests (100ms apart)
- Repeated requests from same user
- Mixed pay period requests

### 3. Manual Integration Test

#### Step 1: Set up test environment
```bash
# Use test configuration
export STORAGE_TYPE=git
export GIT_AUTO_COMMIT=true
export KIMAI_URL=https://kimai.starthub.academy
```

#### Step 2: Simulate Tuesday check
```bash
node ../integrations/tuesday-compliance-check.js
```

#### Step 3: Start webhook handler
```bash
node ../integrations/webhook-handler.js
```

#### Step 4: Simulate concurrent messages
```bash
# In another terminal, send test webhooks
curl -X POST http://localhost:3000/webhook/pumble \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "data": {
      "userId": "test_user1",
      "text": "@timesheet-bot done",
      "channelId": "test_channel1"
    }
  }'
```

## Expected Behavior

### Concurrent Requests
When 2+ users send "done" at the same time:

1. **First request** triggers extraction
2. **Subsequent requests** wait and share the same result
3. **All users** get responses
4. **Only one** extraction occurs

### Queue Debouncing
Within 30 seconds of an extraction:

1. **New requests** use cached data
2. **No API calls** to Kimai
3. **Faster responses** for users
4. **After 30 seconds** - fresh extraction

### Error Scenarios

1. **Kimai down**: Users get error message, can retry
2. **Network timeout**: Graceful failure, no data corruption
3. **Invalid data**: Specific error messages
4. **Git conflicts**: Automatic resolution

## Performance Benchmarks

Based on load testing:

| Concurrent Users | Total Time | Avg per User | Extractions |
|-----------------|------------|--------------|-------------|
| 10              | ~3s        | 300ms        | 1-2         |
| 50              | ~5s        | 100ms        | 2-3         |
| 100             | ~8s        | 80ms         | 3-4         |

Key insights:
- Queue effectively batches requests
- 30-second cache prevents redundant extractions
- System scales well with concurrent users

## Monitoring During Production

### Watch extraction logs
```bash
# See all extractions
tail -f logs/kimai-scheduler.log

# See Git commits (if using Git storage)
cd kimai-data && git log --oneline

# Monitor webhook handler
pm2 logs kimai-webhook
```

### Check queue status
```bash
# Add this endpoint to webhook handler for monitoring
curl http://localhost:3000/queue/status
```

## Common Issues and Solutions

### Issue: Duplicate extractions
**Cause**: Queue not working properly
**Solution**: Check ExtractionQueue initialization

### Issue: Slow responses
**Cause**: No caching or debouncing
**Solution**: Verify 30-second cache is active

### Issue: Lost messages
**Cause**: Webhook handler crashed
**Solution**: Use PM2 for auto-restart

### Issue: Git conflicts
**Cause**: Multiple instances writing
**Solution**: Ensure single webhook handler instance