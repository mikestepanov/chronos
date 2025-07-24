# Manual Test Scripts Migration Guide

The manual test scripts have been replaced by a unified `send-message` CLI. Here's how to migrate:

## Old Script → New Command Mapping

### Simple Messages

```bash
# OLD: node tests/manual/send-hi.js
# NEW:
send-message -c bot-testing -p hi
send-message -g "user1,user2" -m "hi"

# OLD: node tests/manual/send-hi-to-channel.js  
# NEW:
send-message -c bot-testing -m "hi"

# OLD: node tests/manual/dm-mikhail-via-channel.js
# NEW:
send-message -u mikhail -m "hi"
```

### Reminder Tests

```bash
# OLD: node tests/manual/send-reminder-preview.js
# NEW:
send-message -c bot-testing -p reminder-80h

# OLD: node tests/manual/send-dynamic-hours-test.js
# NEW:
send-message -c bot-testing -t timesheet-reminder \
  -s user="Test User" hoursLogged=45 expectedHours=80 periodNumber=20

# OLD: node tests/manual/send-group-dm-preview.js
# NEW:
send-message -c bot-testing -t group-dm-reminder \
  -s user="John" hoursLogged=40 expectedHours=80
```

### Channel Distribution

```bash
# OLD: node tests/manual/send-to-dev-design-now.js
# NEW:
send-message -c dev -p reminder-80h
send-message -c design -p reminder-80h

# OLD: node tests/manual/send-to-test-channel.js
# NEW:
send-message -c bot-testing -m "Test message"
```

### Scheduled Messages

```bash
# OLD: node tests/manual/send-at-1pm.js
# NEW:
send-message -c dev -p reminder-80h --schedule "1pm"

# OLD: node tests/manual/send-at-1250pm.js
# NEW:
send-message -c bot-testing -m "Test" --schedule "12:50pm"
```

### Group DM

```bash
# OLD: node tests/manual/test-group-dm.js
# NEW:
send-message -g "user1,user2,user3" -t group-dm-reminder \
  -s user="Team" hoursLogged=120 expectedHours=240

# OLD: node tests/manual/test-group-dm-dry-run.js
# NEW:
send-message -g "user1,user2" -m "Test" --dry-run
```

## New Features

### List Available Resources

```bash
send-message list templates    # Show all templates
send-message list channels     # Show all channels  
send-message list users        # Show all users
send-message list presets      # Show all presets
```

### Interactive Mode

```bash
send-message interactive       # Step-by-step message builder
send-message i                 # Short alias
```

### Examples

```bash
send-message examples          # Show usage examples
```

### Dry Run

```bash
# Preview any message without sending
send-message -c dev -m "Important!" --dry-run
```

## Benefits of New System

1. **Single Command** - No need to remember different scripts
2. **Consistent Interface** - Same options for all message types
3. **Templates** - Reusable message formats
4. **Presets** - Quick access to common messages
5. **Scheduling** - Built-in delayed sending
6. **Dry Run** - Safe testing without sending
7. **Interactive Mode** - Guided message creation
8. **Better Discovery** - List commands show what's available

## Deprecation Notice

The individual test scripts in `tests/manual/` are deprecated and will be removed in a future version. Please use the new `send-message` CLI instead.