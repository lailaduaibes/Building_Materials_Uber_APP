# Driver App File Cleanup Strategy
*Safe approach to removing unused files without breaking the app*

## 🎯 CLEANUP PHASES (Safe → Risky)

### PHASE 1: DEFINITELY SAFE TO DELETE
**Run these deletions first - very low risk**

#### A. Database/Analysis Files (.sql, .md)
- All `.sql` files (database scripts/analysis)
- All `.md` files (documentation, not code)
- `debug-*.js` files
- `analyze-*.js` files  
- `check-*.js/.sql` files
- `fix-*.sql` files
- `test-*.sql` files

#### B. Backup/Old Files
- Files ending with `-old`, `-backup`, `-test`
- Duplicate files with different names
- Screenshot/image files not used in app

### PHASE 2: PROBABLY SAFE (Check First)
**Requires verification - medium risk**

#### A. Customer App Files (if this is driver-only)
- `CustomerApp*` folders/files
- Customer-specific components
- Files with "customer" in the name

#### B. Unused Components
- Components not imported anywhere
- Old navigation files
- Unused service files

### PHASE 3: NEEDS CAREFUL REVIEW
**High risk - verify thoroughly**

#### A. Core App Files (NEVER DELETE)
- `ProfessionalDriverDashboard.tsx`
- `ProfessionalDriverPaymentDashboard.tsx`
- `DriverService.ts`
- `AuthServiceSupabase.ts`
- `App.tsx`, `package.json`, `app.json`
- Any file imported by the above

## 🛠️ VERIFICATION TOOLS

### 1. Automated Analysis
```bash
# Run the file usage analyzer
node analyze-file-usage.js
```

### 2. Manual Verification Steps
For each file you want to delete:

```bash
# Search for references in the codebase
grep -r "filename" . --include="*.tsx" --include="*.ts" --include="*.js"

# Check for imports
grep -r "from.*filename" . --include="*.tsx" --include="*.ts"
grep -r "import.*filename" . --include="*.tsx" --include="*.ts"
```

### 3. Safe Testing Approach
1. **Backup first**: Commit current state to git
2. **Delete in small batches**: 5-10 files at a time
3. **Test immediately**: Run `npm start` after each batch
4. **Verify app loads**: Check that driver dashboard works
5. **If broken**: Use `git checkout` to restore files

## 🔒 NEVER DELETE THESE
- `ProfessionalDriverDashboard.tsx`
- `ProfessionalDriverPaymentDashboard.tsx`
- `DriverService.ts`
- `AuthServiceSupabase.ts`
- Navigation files actively used
- `package.json`, `app.json`, `expo.json`
- Node modules or `.git` folder

## 📋 CLEANUP CHECKLIST

- [ ] Run automated analysis tool
- [ ] Phase 1: Delete .sql/.md/debug files
- [ ] Test app still works
- [ ] Phase 2: Delete customer app files (if applicable)
- [ ] Test app still works  
- [ ] Phase 3: Review remaining unused files carefully
- [ ] Delete suspicious files one by one with testing

## 🚨 RECOVERY PLAN
If something breaks:
```bash
# Restore specific file
git checkout HEAD -- path/to/file.tsx

# Restore entire commit
git reset --hard HEAD~1
```
