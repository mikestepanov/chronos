# DEPRECATED - Manual Test Scripts

These scripts have been replaced by the unified `send-message` CLI.

## Migration Complete

All functionality from these scripts is now available through:
```bash
./scripts/send-message.js
```

See `MIGRATION.md` for detailed migration instructions.

## To Remove These Scripts

After verifying the new system works for your use cases:
```bash
# Remove all deprecated manual test scripts
rm -f tests/manual/*.js
```

Keep only:
- `MIGRATION.md` - Migration guide
- `DEPRECATED.md` - This file