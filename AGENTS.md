# Agent Instructions

## Checkpointing Protocol

**IMPORTANT: All changes must be checkpointed using git commits.**

### Prerequisites:
✅ **Git is installed** (version 2.52.0)

### Workflow:

1. **Initialize repository (first time only):**
   ```bash
   git init
   git add dnb_generator.html AGENTS.md
   git commit -m "initial: DnB + French Electro + G-House generator"
   ```

2. **Before making changes:**
   ```bash
   git status  # Check current state
   ```

3. **After making changes:**
   ```bash
   git add <modified-files>
   git commit -m "descriptive message of changes"
   ```

4. **Commit message format:**
   ```
   <type>: <description>
   
   - Added: <new features>
   - Modified: <changes>
   - Fixed: <bug fixes>
   ```

### Example:
```bash
git add dnb_generator.html
git commit -m "feat: add Malaa G-House bass and vocal chops

- Added G-House Bass track with glide control
- Added Vocal Chops track with 5 vocal words
- Added Dark Pad for atmosphere
- Added Malaa pattern preset at 124 BPM"
```

### Project Structure:
- `dnb_generator.html` - Main application file (151KB)
- `AGENTS.md` - This file (agent instructions)

### Current Status:
- 12 total tracks (5 DnB + 4 French Electro + 3 G-House)
- 9 pattern presets
- BPM range: 60-200
- File size: ~151KB

### Notes:
- Keep commits atomic (one logical change per commit)
- Write descriptive commit messages
- Check `git log` to see history

---
**Status:** ✅ Git is ACTIVE and configured
**Repository:** Initialized with initial commit (ad655f9)
**User:** Fasab <fasab@dnb-generator.com>
**Last Updated:** Git installed and first commit made
