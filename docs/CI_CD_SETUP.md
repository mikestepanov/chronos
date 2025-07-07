# CI/CD Setup for Bots

## Overview

This document describes the Continuous Integration and Continuous Deployment setup for the bot systems.

## GitHub Actions Workflows

### 1. Test Bots (`test-bots.yml`)
**Triggers**: Push to main/dev/writing branches, PRs to main/dev
**Purpose**: Run comprehensive test suite across multiple Node versions

**What it does**:
- Tests on Node 18.x and 20.x
- Runs all Jest tests
- Generates coverage reports
- Uploads results to Codecov
- Archives test artifacts

### 2. Bot Quality Checks (`bot-quality-checks.yml`)
**Triggers**: Push/PR on any JS, JSON, or MD file changes in bots/
**Purpose**: Ensure code quality and security

**What it does**:
- Checks for exposed API keys
- Runs unit tests for each component
- Generates test reports
- Comments results on PRs
- Runs critical path tests

## Local Testing

### Pre-commit Testing
Before committing, run:
```bash
./check-tests.sh
```

This script:
- Runs critical tests quickly
- Shows coverage summary
- Gives clear pass/fail status

### Full Test Suite
```bash
./run-tests.sh         # All tests
./run-tests.sh unit    # Unit tests only
./run-tests.sh coverage # With coverage report
```

### Pre-push Hook
If using Husky, tests run automatically before push:
```bash
cd /home/mstepanov/Documents/GitHub/omega
npx husky add bots/.husky/pre-push "cd bots && npm run test:pay-period"
```

## Test Requirements

### Minimum Coverage Targets
- **Pay Period Calculator**: 100% (critical business logic)
- **Monday Reminder Bot**: 80%
- **Resilient Sender**: 90%
- **Overall**: 80%

### Critical Tests That Must Pass
1. Pay period boundary calculations
2. Last day of period detection
3. Message formatting with correct dates
4. Retry mechanism with delays
5. Error handling for API failures

## Branch Protection Rules

### Recommended GitHub Settings
1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Required status checks:
     - `test / Run Bot Tests (18.x)`
     - `test / Run Bot Tests (20.x)`
     - `quality-checks / Code Quality & Tests`
   - ✅ Require conversation resolution
   - ✅ Include administrators

## Deployment Pipeline

### Automated Deployment (Future)
```yaml
# Example deployment job
deploy:
  needs: [test, quality-checks]
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to production
      run: |
        # Deploy scripts here
```

### Manual Deployment Checklist
1. ✅ All tests passing
2. ✅ Coverage targets met
3. ✅ No exposed secrets
4. ✅ Monday reminder preview tested
5. ✅ Environment variables documented

## Monitoring

### GitHub Actions Status
- Check: https://github.com/username/omega/actions
- Enable notifications for failed workflows

### Local Status Check
```bash
# Quick status check
cd bots
npm test -- --listTests    # See what tests exist
npm test -- --findRelatedTests monday-reminder.js  # Test specific file
```

## Troubleshooting

### Common CI Failures

1. **Module not found**
   - Ensure `npm ci` runs before tests
   - Check import paths are correct

2. **Timezone issues**
   - Tests use fixed dates
   - CI runs in UTC

3. **Coverage drops**
   - New code needs tests
   - Check coverage report in artifacts

4. **Flaky tests**
   - Usually timing issues
   - Use `jest.useFakeTimers()`

### Running CI Locally
```bash
# Simulate CI environment
export CI=true
export NODE_ENV=test
cd bots
npm ci
npm test
```

## Best Practices

1. **Write tests first** for new features
2. **Keep tests fast** - mock external services
3. **Use descriptive test names**
4. **Test edge cases** especially for dates
5. **Review coverage reports** in PRs

## Future Enhancements

1. **Performance benchmarks** - Ensure no degradation
2. **E2E tests** with real Pumble sandbox
3. **Automated dependency updates** with Dependabot
4. **Security scanning** with CodeQL
5. **Deployment automation** to cloud services