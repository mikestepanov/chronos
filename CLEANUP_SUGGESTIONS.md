# Cleanup Suggestions

## Files to Consider Removing

### Duplicate/Old Versions
1. `monday-reminder/monday-reminder-v2.js` - Check if this is newer/better than main version
2. `monday-reminder/send-advance-notification.js` - Superseded by resilient version

### One-off Test Files (in pumble/tests/)
These were likely created during development and can probably be removed:
- `test-asbot-parameter.js` - Specific test for asBot parameter
- `test-specific-channel.js` - Testing specific channel IDs
- `find-mikhail-dm.js` - One-time channel discovery
- `find-bot-to-mikhail-dm.js` - One-time channel discovery
- `check-dm-channels.js` - One-time channel check

### Data Directory
- `kimai-data/` - Consider moving to `/misc/data/kimai-extracts/` to separate data from code

## Files to Keep
- All files in `shared/` - Core functionality
- Main bot files in each platform directory
- Documentation in `docs/`
- Active test files that verify core functionality

## Import Path Updates Completed
✅ Updated all `require('./lib/')` to `require('../shared/')`
✅ Updated all `require('../lib/')` to `require('../shared/')`

## Next Steps
1. Test each bot system to ensure imports work correctly
2. Remove duplicate/unnecessary files after confirming which versions to keep
3. Consider moving `kimai-data/` out of the bots directory
4. Update any external references to the old structure