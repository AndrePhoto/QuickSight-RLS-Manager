# Managing Permissions Guide

This is the core functionality of the RLS Manager - creating, editing, and publishing Row-Level Security permissions through an intuitive visual interface.

## Overview

The Manage Permissions page allows you to:

- **Select** a region and DataSet to secure
- **Create** permissions for users and groups
- **Edit** existing permissions
- **Copy** permissions from another DataSet (managed by RLS Manager)
- **Delete** unwanted permissions
- **Publish** changes to QuickSight
- **Monitor** publishing progress
- **Rollback** to previous versions
- **Export** permissions as CSV

## Permission Management Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION LIFECYCLE                      │
└─────────────────────────────────────────────────────────────┘

    1. SELECT          2. CREATE         3. PUBLISH        4. VERIFY
   ┌────────┐        ┌─────────┐       ┌──────────┐     ┌─────────┐
   │ Region │   →    │ Add/Edit│  →    │ Publish  │  →  │ Monitor │
   │DataSet │        │Permissions│      │ to QS    │     │ Status  │
   └────────┘        └─────────┘       └──────────┘     └─────────┘
                           ↓                                   ↓
                     ┌─────────┐                         ┌─────────┐
                     │ Review  │                         │Rollback │
                     │ Changes │                         │(if needed)│
                     └─────────┘                         └─────────┘
```

**Time Required**: 
- Creating permissions: 2-5 minutes
- Publishing: 2-5 minutes (depending on SPICE ingestion)
- Total: 5-10 minutes per DataSet

---

## Getting Started

Before managing permissions, ensure you've completed:
- ✅ [Installation](Install.md)
- ✅ [Initialization](Initialization.md) with at least one region configured

### Important: Manageable vs Un-Manageable DataSets

**Manageable DataSets** (🟢 PUBLISHED):
- Created from standard data sources (S3, Redshift, Athena, etc.)
- Can be automatically published via API
- Permissions show 🟢 PUBLISHED status after publishing
- Full automation available

**Un-Manageable DataSets** (🟠 MANUAL):
- Created by uploading files directly to QuickSight
- Cannot be managed via RLS Manager
- Permissions show 🟠 MANUAL status (always)
- RLS Manager can help create permissions, but you must manually download CSV and upload to QuickSight
- See [Working with MANUAL Permissions](#working-with-manual-permissions) for details

## Step 1: Select a Region

Choose the AWS region where your DataSet is located.

### Region Selection

1. **Navigate to Manage Permissions** page
2. **Select a Region** from the dropdown
3. **View Region Details** displayed below

**Don't see your region?** 
- Ensure it was added during [Initialization](Initialization.md)
- Or add it via **Global Settings** page

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-01.png)

### Region Details Dashboard

Once a region is selected, you'll see comprehensive information:

#### 💾 SPICE Capacity

Displays your SPICE subscription status in the selected region:

- **Total Capacity** - Your SPICE subscription size (GB)
- **Used Capacity** - Currently consumed SPICE (GB)
- **Free Capacity** - Available SPICE for new DataSets (GB)
- **Usage Percentage** - Visual indicator of capacity utilization

**Why This Matters**:
- RLS DataSets are created in SPICE mode
- Publishing requires available SPICE capacity
- If capacity is full, publishing will fail
- Consider upgrading SPICE or removing unused DataSets

**Capacity Guidelines**:
- 🟢 **< 80% Used** - Healthy, plenty of space
- 🟡 **80-95% Used** - Monitor closely, consider cleanup
- 🔴 **> 95% Used** - Critical, publishing may fail

#### 📊 DataSet Summary

Shows DataSet statistics for the selected region:

**Manageable DataSets**:
- Can be managed through the RLS Manager
- Created via QuickSight UI with standard sources
- Created via QuickSight API
- Support RLS operations

**Un-Manageable DataSets**:
- Cannot be managed via API (QuickSight limitation)
- Examples:
  - DataSets created by uploading files directly to QuickSight
  - Legacy DataSets with unsupported configurations
  - DataSets with certain data prep transformations
- **These DataSets CAN appear in the dropdown**
- Permissions for these will have 🟠 MANUAL status
- You must manually download CSV and upload to QuickSight

**Created with RLS Manager**:
- RLS DataSets created by this tool
- Tagged with `RLS-Manager: True`
- Automatically managed and updated
- Don't appear in the DataSet selection (they're RLS DataSets, not main DataSets)

#### 🏗️ Regional Resources

Displays IDs of AWS resources created during region initialization:

- **S3 Bucket** - `qs-managed-rls-[UUID]`
- **Glue Database** - `qs-managed-rls-[UUID]`
- **QuickSight DataSource** - `qs-managed-rls-[UUID]`

**Use Cases**:
- Debugging issues
- Manual data inspection
- CloudWatch log analysis
- Direct S3 access for CSV files

⚠️ **Warning**: Manual changes to these resources can break the RLS Manager. Only modify if you know what you're doing.

## Step 2: Select a DataSet

Choose the DataSet you want to secure with Row-Level Security.

### DataSet Selection

1. **Select a DataSet** from the dropdown
2. **View DataSet Details** displayed below
3. **Review existing permissions** (if any)

**What appears in the dropdown?**
- ✅ Manageable DataSets (can auto-publish via API)
- ✅ Un-manageable DataSets (require manual CSV upload)
- ✅ DataSets NOT created by RLS Manager
- ❌ RLS DataSets (they're for permissions, not data)

**Note**: Un-manageable DataSets will show permissions with 🟠 MANUAL status

**Don't see your DataSet?**
- Check if it's manageable (not a file upload)
- Refresh data from **Global Settings** page
- Verify it exists in the selected region
- See [Initialization Guide](Initialization.md) for troubleshooting

**View all DataSets**: Navigate to **DataSets List** page for complete inventory

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-02.png)

### DataSet Details

Once selected, comprehensive DataSet information is displayed:

#### Basic Information

**Name** - Display name in QuickSight
**ID** - Unique DataSet identifier
**ARN** - Amazon Resource Name (for IAM policies)

#### Configuration

**Import Mode**:
- 🔵 **SPICE** - Data cached in-memory for fast queries
- 🟢 **DIRECT_QUERY** - Real-time queries to data source

**Manageable**:
- ✅ **Yes** - Can auto-publish via API (permissions will be 🟢 PUBLISHED)
- ❌ **No** - Requires manual CSV upload (permissions will be 🟠 MANUAL)

**Created** - When the DataSet was first created
**Last Updated** - Most recent modification timestamp

#### RLS Status

The RLS status indicator shows the current state:

**🔴 DISABLED**:
- No RLS currently applied
- All users see all data
- Ready to add RLS via RLS Manager

**🟢 ENABLED (Green)**:
- RLS is active and managed by RLS Manager
- Permissions controlled through this interface
- Safe to edit and publish changes

**🟠 ENABLED (Orange)**:
- RLS is active but managed directly in QuickSight
- Not controlled by RLS Manager
- You can take over management by publishing new permissions

#### RLS DataSet Information

If RLS is enabled, you'll also see:

**RLS DataSet ID** - The DataSet containing permission rules
**RLS DataSet Name** - Usually `[DataSet Name]-RLS`
**Version** - Current published version number
**Last Published** - When permissions were last updated

## Step 3: Manage Permissions

Create, edit, and delete permissions for users and groups.

### Permission Actions Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    PERMISSION ACTIONS                         │
└──────────────────────────────────────────────────────────────┘

  ➕ ADD           ✏️ EDIT          🗑️ DELETE        🚀 PUBLISH
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐
│ Create  │     │ Modify  │     │ Remove  │     │ Apply to │
│ New     │     │ Filter  │     │ Existing│     │QuickSight│
│Permission│    │ Values  │     │Permission│    │          │
└─────────┘     └─────────┘     └─────────┘     └──────────┘
     ↓               ↓               ↓                ↓
┌─────────────────────────────────────────────────────────────┐
│              Stored in DynamoDB (PENDING)                    │
│         Changes NOT applied until Published                  │
└─────────────────────────────────────────────────────────────┘
```

---

### Adding Permissions

Create new permissions to control data access for users or groups.

#### Step-by-Step Instructions

1. **Click "Add Permission"** button

2. **Select Principal Type**
   - **User** - Individual QuickSight user
   - **Group** - QuickSight group (recommended for easier management)

3. **Select User or Group**
   - Choose from the dropdown list
   - List shows all users/groups from Management Region
   
   **Don't see a user/group?**
   - Refresh data from **Global Settings** page
   - Verify user/group exists in QuickSight
   - Check Management Region is correctly configured

4. **Define Permission Rules**

   **Option A: Grant Full Access**
   - Toggle **"Sees All"** button ON
   - User/group sees ALL data in the DataSet
   - No field-level filtering applied
   - Useful for admins or managers

   **Option B: Field-Level Filtering**
   - Toggle **"Sees All"** button OFF
   - **Select Field** from dropdown (DataSet columns)
   - **Enter Values** - Comma-separated list
   - User/group sees only rows matching these values

5. **Click "Create Permission"**

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-03.png)

#### Permission Examples

**Example 1: Regional Manager**
```
Type: User
User: john.smith@company.com
Field: Region
Values: US-West, US-East
Result: John sees only US-West and US-East data
```

**Example 2: Sales Team**
```
Type: Group
Group: Sales-Team
Field: Department
Values: Sales
Result: Sales team members see only Sales department data
```

**Example 3: Executive Access**
```
Type: User
User: ceo@company.com
Sees All: ON
Result: CEO sees all data without restrictions
```

**Example 4: Multi-Value Filter**
```
Type: Group
Group: Product-Managers
Field: Product
Values: Widget-A, Widget-B, Widget-C
Result: Product managers see data for these three products only
```

#### Editing Existing Permissions

If you select a user/group that already has permissions:

- ⚠️ **Warning message** appears
- You're now **editing** the existing permission
- Previous values are pre-filled
- Changes overwrite the existing permission

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-04.png)
![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-05.png)

---

### Viewing Permissions

Once permissions are created, they appear in the permissions table.

#### Permissions Table

**Grouped by User/Group**:
- All permissions organized by principal
- Easy to see who has access to what
- Color-coded status indicators

**Columns**:
- **Type** - User or Group
- **Name** - User email or group name
- **Field** - Filtered field (or "All" if Sees All)
- **Values** - Allowed values (or "All Data")
- **Status** - PENDING, PUBLISHED, FAILED, or MANUAL
- **Actions** - Edit and Delete buttons

#### Quick Status Reference

| Status | Color | Meaning | In QuickSight? | Action Needed |
|--------|-------|---------|----------------|---------------|
| 🟡 PENDING | Yellow | Created/edited, not published | ❌ No | Publish to activate |
| 🟢 PUBLISHED | Green | Successfully published via API | ✅ Yes | None (active) |
| 🔴 FAILED | Red | Publishing failed | ❌ No | Fix error, republish |
| 🟠 MANUAL | Orange | Un-manageable DataSet | Depends | Download CSV, upload manually |

#### Status Indicators

Permissions can have four different statuses:

```
┌──────────────────────────────────────────────────────────────┐
│                  PERMISSION STATUS LIFECYCLE                  │
└──────────────────────────────────────────────────────────────┘

    CREATE/EDIT              PUBLISH              SUCCESS
   ┌──────────┐           ┌──────────┐         ┌──────────┐
   │�U PENDING│    →      │Publishing│    →    │🟢PUBLISHED│
   │          │           │Workflow  │         │          │
   └──────────┘           └──────────┘         └──────────┘
        ↑                      ↓                      ↓
        │                   FAILURE                  EDIT
        │                      ↓                      ↓
        │                 ┌──────────┐          ┌──────────┐
        └─────────────────│🔴 FAILED │          │🟡 PENDING│
                          │          │          │          │
                          └──────────┘          └──────────┘

    UN-MANAGEABLE DATASET
   ┌──────────┐
   │🟠 MANUAL │  ──→  Download CSV  ──→  Manual Upload to QuickSight
   │          │       (Always MANUAL)
   └──────────┘
```

**🟡 PENDING** (Yellow):
- Permission created/edited but not yet published
- Not yet active in QuickSight
- Stored only in RLS Manager (DynamoDB)
- Can be edited or deleted freely
- Requires publishing to take effect

**🟢 PUBLISHED** (Green):
- Permission successfully published to QuickSight
- Currently active and enforcing data access
- Stored in both RLS Manager and QuickSight
- Edits create PENDING status (requires republishing)
- Users see filtered data based on these permissions

**🔴 FAILED** (Red):
- Publishing attempt failed for this permission
- Not active in QuickSight
- Error occurred during publish workflow
- Check logs for specific error details
- Fix the issue and republish

**🟠 MANUAL** (Orange):
- Permission is for an **un-manageable DataSet** (e.g., file upload DataSets)
- Cannot be automatically published via API
- RLS Manager generates the CSV for you
- You must manually download CSV and upload to QuickSight
- Permissions tracked in RLS Manager but applied manually
- Status remains MANUAL even after you upload to QuickSight

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-06.png)

---

### Editing Permissions

Modify existing permissions directly in the table.

#### What Can Be Edited

- ✅ **Filter Values** - Change the allowed values
- ✅ **Sees All Toggle** - Switch between full access and filtered
- ❌ **User/Group** - Cannot change (delete and recreate instead)
- ❌ **Field** - Cannot change (delete and recreate instead)

#### How to Edit

1. **Click Edit icon** (pencil) in the Actions column
2. **Modify values** in the inline editor
3. **Click Save** to confirm changes
4. **Status changes to PENDING** (requires republishing)

#### Inline Editing

- Changes are immediate in the UI
- Stored in DynamoDB instantly
- NOT applied to QuickSight until published
- Can be reverted before publishing

#### Status Changes When Editing

- **PUBLISHED** → **PENDING** - Edited permission needs republishing
- **PENDING** → **PENDING** - Still pending, just modified
- **FAILED** → **PENDING** - Fixed permission ready to retry
- **MANUAL** → **MANUAL** - Still manual (un-manageable DataSet), download new CSV

---

### Deleting Permissions

Remove permissions that are no longer needed.

#### How to Delete

1. **Click Delete icon** (trash) in the Actions column
2. **Confirm deletion** in the popup dialog
3. **Permission removed** from the table
4. **Deletion marked as PENDING** (requires republishing to remove from QuickSight)

#### Important Notes

- Deletion is immediate in the UI
- Removed from DynamoDB instantly
- NOT removed from QuickSight until published
- Can be undone by recreating before publishing

#### Status-Specific Deletion Behavior

- **PUBLISHED** - Deleted from UI, marked for removal, requires publishing to remove from QuickSight
- **PENDING** - Deleted from UI, never made it to QuickSight, no publishing needed
- **FAILED** - Deleted from UI, was never in QuickSight, no publishing needed
- **MANUAL** - Deleted from UI, you must manually remove from QuickSight (download new CSV, upload)

#### Bulk Deletion

To delete multiple permissions:
1. Delete each permission individually
2. All deletions are batched
3. Publish once to apply all changes

---

### Pending Changes Warning

After creating, editing, or deleting permissions, you'll see:

⚠️ **"You have unpublished changes"** warning banner

**Why This Design?**

1. **Batch Operations** - Make multiple changes, publish once
2. **Review Before Apply** - Check changes before affecting users
3. **Error Prevention** - Catch mistakes before they impact production
4. **API Efficiency** - Fewer API calls to AWS services

**What's Pending?**

The warning shows:
- Number of permissions added
- Number of permissions modified
- Number of permissions deleted
- Last change timestamp

**Next Step**: Publish changes to apply them to QuickSight

---

## Step 4: Publish Permissions

Apply your changes to QuickSight and activate RLS.

### Publishing Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                   PUBLISHING WORKFLOW                         │
└──────────────────────────────────────────────────────────────┘

    Click Publish
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 0: Validation (5s)                                 │
    │ ✓ Check AWS resources exist                            │
    │ ✓ Verify IAM permissions                               │
    │ ✓ Validate DataSet is manageable                       │
    └─────────────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 1: S3 Upload (10s)                                │
    │ ✓ Generate CSV from permissions                        │
    │ ✓ Upload to S3 with versioning                         │
    └─────────────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 2: Glue Table (15s)                               │
    │ ✓ Create/update Glue table metadata                    │
    │ ✓ Define schema for CSV structure                      │
    └─────────────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 3: RLS DataSet (30s)                              │
    │ ✓ Create/update QuickSight RLS DataSet                 │
    │ ✓ Connect to Glue table via Athena                     │
    │ ✓ Configure SPICE ingestion                            │
    └─────────────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 4: Apply RLS (20s)                                │
    │ ✓ Link RLS DataSet to Main DataSet                     │
    │ ✓ Preserve existing DataSet settings                   │
    └─────────────────────────────────────────────────────────┘
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Step 99: Check Ingestion (0-300s)                      │
    │ ✓ Monitor SPICE ingestion progress                     │
    │ ✓ Wait for completion                                  │
    │ ✓ Verify successful data load                          │
    └─────────────────────────────────────────────────────────┘
         ↓
    ✅ RLS Active in QuickSight
```

### How to Publish

**For Manageable DataSets** (Automated):
1. **Review pending changes** in the permissions table
2. **Click "Publish"** button
3. **Monitor progress** in the Status section
4. **Wait for completion** (2-5 minutes typically)
5. **Verify success** - Status shows 🟢 PUBLISHED

**For Un-Manageable DataSets** (Manual):
1. **Review permissions** with 🟠 MANUAL status
2. **Click "Export CSV"** section
3. **Download CSV** file
4. **Open QuickSight Console**
5. **Navigate to DataSet → Permissions**
6. **Upload CSV** manually
7. **Status remains 🟠 MANUAL** (this is expected)

### Monitoring Progress

The UI shows real-time progress:

- **Current Step** - Which step is executing
- **Step Status** - Success, In Progress, or Failed
- **Duration** - Time elapsed for each step
- **Logs** - Detailed execution logs
- **Overall Progress** - Percentage complete

### Publishing Duration

**Typical Timeline**:
- Validation: ~5 seconds
- S3 Upload: ~10 seconds
- Glue Table: ~15 seconds
- RLS DataSet: ~30 seconds
- Apply RLS: ~20 seconds
- Check Ingestion: 0-300 seconds (depends on data size)

**Total**: 2-5 minutes (most cases)

### What Happens During Publishing

1. **CSV Generation** - Permissions converted to QuickSight RLS format
2. **Version Creation** - New version number assigned
3. **S3 Storage** - CSV uploaded with versioning enabled
4. **Metadata Update** - Glue table schema updated
5. **DataSet Creation** - RLS DataSet created or updated
6. **RLS Application** - Main DataSet linked to RLS DataSet
7. **SPICE Ingestion** - Data loaded into QuickSight
8. **Status Update** - Permissions status updated based on result

### Status Updates During Publishing

**Before Publishing**:
- All changed permissions show 🟡 PENDING

**During Publishing**:
- Publishing workflow executes (6 steps)
- Progress shown in real-time
- Logs available for monitoring

**After Successful Publishing**:
- ✅ All permissions marked as 🟢 PUBLISHED
- ✅ Version number increments
- ✅ Pending changes warning disappears
- ✅ Permissions active in QuickSight

**After Failed Publishing**:
- ❌ Failed permissions marked as 🔴 FAILED
- ❌ Successful permissions marked as 🟢 PUBLISHED (partial success possible)
- ❌ Error details in CloudWatch logs
- ❌ Version may or may not increment (depends on failure point)

### Success Confirmation

When publishing completes successfully:

✅ **All steps show green checkmarks**
✅ **Status changes to "Published"**
✅ **Version number increments**
✅ **Pending changes warning disappears**
✅ **All permissions show 🟢 PUBLISHED status**

### Partial Success Handling

Sometimes publishing partially succeeds:

**Scenario**: 10 permissions, 8 succeed, 2 fail
- 8 permissions → 🟢 PUBLISHED (active in QuickSight)
- 2 permissions → 🔴 FAILED (not active)
- Version increments (partial success still creates version)
- Fix failed permissions and republish

**Why Partial Success Occurs**:
- Individual permission validation issues
- User/group doesn't exist
- Field name mismatch
- Invalid characters in values
- Data type incompatibility

### Testing RLS

After publishing, verify RLS is working:

1. **Open QuickSight Console**
2. **Navigate to the DataSet**
3. **Check RLS settings** - Should show RLS DataSet linked
4. **Test with different users**:
   - Log in as a restricted user
   - Open a dashboard using the DataSet
   - Verify only permitted data is visible

---

## Additional Actions

### Export Permissions as CSV

Download the current permissions in CSV format.

#### Why Export?

- **Backup** - Save permissions for disaster recovery
- **Audit** - Review permissions offline
- **Documentation** - Share with stakeholders
- **Migration** - Move permissions to another environment
- **Analysis** - Analyze permission patterns

#### How to Export

1. **Open "Export CSV" section**
2. **Select version** (current or previous)
3. **Click "Download CSV"**
4. **File downloads** - Format: `[DataSet]-RLS-v[Version].csv`

![Manage Permissions](/Guide/images/ManagePermissions/ManagePermissions-07.png)

#### CSV Format

The exported CSV follows QuickSight RLS format:

```csv
UserName,GroupName,Region,Department
john@company.com,,US-West,Sales
,Sales-Team,US-East,Sales
jane@company.com,,US-West,Marketing
```

**Columns**:
- `UserName` - User email (or empty if group)
- `GroupName` - Group name (or empty if user)
- Additional columns - Your DataSet fields with allowed values

#### Alternative: Direct S3 Access

You can also access CSV files directly from S3:

1. **Navigate to S3 Console**
2. **Open bucket** - `qs-managed-rls-[UUID]`
3. **Browse to DataSet folder**
4. **Download CSV files** - All versions available

---

### Version History

View and manage previous permission versions.

#### Viewing Version History

1. **Open "Version History" section**
2. **See all published versions**:
   - Version number
   - Published timestamp
   - Number of permissions
   - Published by (user)
   - Status (Current or Previous)

#### Version Information

Each version shows:
- **Version Number** - Incremental (1, 2, 3...)
- **Published Date** - When it was published
- **Permission Count** - Total permissions in this version
- **Status** - Current (active) or Previous
- **Actions** - View details, Download CSV, Rollback

---

### Rollback to Previous Version

Revert to a previous permission configuration.

#### When to Rollback

- ❌ Published incorrect permissions
- ❌ Users reporting access issues
- ❌ Need to undo recent changes
- ❌ Testing different permission configurations

#### Rollback Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    ROLLBACK WORKFLOW                          │
└──────────────────────────────────────────────────────────────┘

    Select Version
         ↓
    Preview Changes
         ↓
    Confirm Rollback
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │ Creates NEW version with old permissions                │
    │ (Does NOT delete current version)                       │
    └─────────────────────────────────────────────────────────┘
         ↓
    Publishing Workflow
    (Same 6 steps as normal publish)
         ↓
    ✅ Rolled Back Successfully
```

#### How to Rollback

1. **Open "Version History" section**
2. **Select previous version** to restore
3. **Click "Rollback"** button
4. **Review changes** in the preview dialog:
   - Permissions that will be added
   - Permissions that will be removed
   - Permissions that will change
5. **Confirm rollback**
6. **Monitor publishing progress**
7. **Verify success**

#### Important Notes

- ✅ **Safe Operation** - Creates new version, doesn't delete history
- ✅ **Full Audit Trail** - All versions preserved
- ✅ **Can Rollback Again** - Can undo the rollback
- ⚠️ **Requires Publishing** - Goes through full publish workflow
- ⚠️ **Takes Time** - Same duration as normal publish (2-5 minutes)

#### Rollback Example

```
Current State:
Version 3 (Current) - 150 permissions
Version 2           - 145 permissions
Version 1           - 120 permissions

Action: Rollback to Version 2

Result:
Version 4 (Current) - 145 permissions (copy of Version 2)
Version 3           - 150 permissions
Version 2           - 145 permissions
Version 1           - 120 permissions
```

---

### Import Permissions (Bulk Upload)

Import permissions from a CSV file for bulk operations.

#### When to Use

- 📥 **Initial Setup** - Import many permissions at once
- 📥 **Migration** - Move permissions from another system
- 📥 **Bulk Updates** - Update many permissions efficiently
- 📥 **Disaster Recovery** - Restore from backup

#### CSV Format Requirements

Your CSV must follow QuickSight RLS format:

```csv
UserName,GroupName,Field1,Field2,Field3
john@company.com,,Value1,Value2,Value3
,GroupName,Value1,Value2,Value3
```

**Rules**:
- First row: Headers (UserName, GroupName, then your field names)
- UserName OR GroupName must be filled (not both)
- Field columns match your DataSet fields
- Values are exact matches (case-sensitive)
- Empty values mean no restriction for that field

#### How to Import

1. **Prepare CSV file** following format requirements
2. **Click "Import Permissions"** button
3. **Select CSV file** from your computer
4. **Review preview** of permissions to be imported
5. **Choose import mode**:
   - **Replace All** - Delete existing, import new
   - **Merge** - Add to existing, skip duplicates
   - **Update** - Add new, update existing
6. **Click "Import"**
7. **Review results** - Shows success/error count
8. **Publish changes** to apply

#### Import Validation

The system validates:
- ✅ CSV format is correct
- ✅ Headers match DataSet fields
- ✅ Users/groups exist in QuickSight
- ✅ Field names are valid
- ❌ Rejects invalid rows with error messages

---

### Working with MANUAL Permissions

Handle permissions for un-manageable DataSets that require manual CSV upload.

#### What are MANUAL Permissions?

MANUAL permissions are for **un-manageable DataSets** that cannot be controlled via QuickSight API:

**Un-Manageable DataSets Include**:
- DataSets created by directly uploading files to QuickSight
- Legacy DataSets with unsupported configurations
- DataSets with certain data prep transformations
- Any DataSet that QuickSight API cannot modify

#### Why MANUAL Status?

- 🟠 QuickSight API limitations prevent automated publishing
- 🟠 RLS Manager can still help you create and track permissions
- 🟠 You must manually download CSV and upload to QuickSight
- 🟠 Status remains MANUAL permanently (cannot change to PUBLISHED)

#### MANUAL Workflow

```
┌──────────────────────────────────────────────────────────────┐
│              MANUAL PERMISSION WORKFLOW                       │
└──────────────────────────────────────────────────────────────┘

1. CREATE PERMISSIONS      2. DOWNLOAD CSV       3. MANUAL UPLOAD
   ┌──────────────┐          ┌──────────────┐      ┌──────────────┐
   │ Use RLS      │    →     │ Export CSV   │  →   │ Upload to    │
   │ Manager UI   │          │ from RLS Mgr │      │ QuickSight   │
   │              │          │              │      │ Console      │
   └──────────────┘          └──────────────┘      └──────────────┘
         ↓                         ↓                      ↓
   🟠 MANUAL Status         CSV Generated          RLS Active in QS
   (Tracked in RLS Mgr)     (Ready to upload)      (You applied it)
```

#### How to Use MANUAL Permissions

**Step 1: Create Permissions in RLS Manager**
1. Select the un-manageable DataSet
2. Add permissions as usual (users, groups, fields, values)
3. Permissions are saved with 🟠 MANUAL status
4. RLS Manager tracks them for you

**Step 2: Download CSV**
1. Open **"Export CSV"** section
2. Click **"Download CSV"**
3. CSV file downloads with all permissions
4. File format: QuickSight RLS format (ready to use)

**Step 3: Upload to QuickSight Manually**
1. Open **QuickSight Console**
2. Navigate to your DataSet
3. Go to **Permissions** tab
4. Click **"Manage row-level security"**
5. Upload the CSV file you downloaded
6. QuickSight applies the RLS rules

**Step 4: Update When Needed**
1. Edit permissions in RLS Manager (still 🟠 MANUAL)
2. Download new CSV
3. Upload to QuickSight again (overwrites previous)
4. Repeat as needed

#### Benefits of Using RLS Manager for MANUAL DataSets

Even though you must manually upload, RLS Manager still provides:

✅ **Visual Interface** - Easier than editing CSV manually
✅ **Permission Tracking** - Keep record of all permissions
✅ **Version History** - Track changes over time (in RLS Manager)
✅ **CSV Generation** - Automatic CSV formatting
✅ **Validation** - Checks for errors before download
✅ **Centralized Management** - Manage all DataSets in one place

#### Limitations of MANUAL Permissions

❌ **No Automated Publishing** - Must manually upload CSV
❌ **No Automatic Sync** - QuickSight changes not reflected in RLS Manager
❌ **No Rollback** - Cannot automatically revert in QuickSight
❌ **Manual Process** - More steps than manageable DataSets
❌ **Status Always MANUAL** - Cannot change to PUBLISHED

#### Converting Un-Manageable to Manageable

To enable automated publishing, you must recreate the DataSet:

**Option 1: Recreate DataSet**
1. Create new DataSet using standard data source (not file upload)
2. Configure same fields and transformations
3. Import permissions from old DataSet
4. Now manageable - can use automated publishing

**Option 2: Use Different Data Source**
1. Upload data to S3, Redshift, or other supported source
2. Create DataSet from that source
3. Now manageable via API

#### Best Practices for MANUAL DataSets

✅ **Document the Process** - Note that this DataSet requires manual upload
✅ **Set Reminders** - Remember to upload CSV after changes
✅ **Test After Upload** - Verify RLS works in QuickSight
✅ **Keep CSV Backups** - Save downloaded CSVs for reference
✅ **Consider Migration** - Evaluate if DataSet can be recreated as manageable

---

### Refresh Data

Update users, groups, and DataSet information from QuickSight.

#### What Gets Refreshed

- 👥 **Users** - Latest user list from QuickSight
- 👥 **Groups** - Latest group list from QuickSight
- 📊 **DataSets** - Latest DataSet metadata
- 💾 **SPICE Capacity** - Current usage statistics
- 🟠 **MANUAL Permissions** - Detect externally created RLS

#### When to Refresh

- New users or groups added to QuickSight
- DataSet schema changed
- SPICE capacity updated
- Users/groups not appearing in dropdowns
- After creating RLS directly in QuickSight

#### How to Refresh

**From Manage Permissions Page**:
1. Click **"Refresh Data"** button
2. Wait for completion (~10-30 seconds)
3. Dropdowns update automatically
4. MANUAL permissions detected and displayed

**From Global Settings Page**:
1. Navigate to **Global Settings**
2. Click **"Sync Users"** or **"Sync Groups"**
3. Click **"Refresh DataSets"**
4. Return to Manage Permissions

---

## Best Practices

### Permission Design

✅ **Use Groups Over Users**
- Easier to manage at scale
- Reduces permission count
- Simplifies auditing
- Aligns with organizational structure

✅ **Start Simple**
- Begin with basic permissions
- Test thoroughly
- Add complexity gradually
- Document permission logic

✅ **Test Before Production**
- Create test DataSet first
- Verify permissions work correctly
- Test with actual users
- Monitor for issues

✅ **Document Permissions**
- Keep notes on permission logic
- Document special cases
- Maintain permission inventory
- Share with team

### Operational Best Practices

✅ **Regular Reviews**
- Audit permissions quarterly
- Remove unused permissions
- Update for organizational changes
- Verify users still need access

✅ **Version Control**
- Review changes before publishing
- Use descriptive version notes
- Keep version history
- Test rollback procedures

✅ **Monitor SPICE Capacity**
- Check capacity before publishing
- Clean up unused DataSets
- Upgrade if consistently near limit
- Set up CloudWatch alarms

✅ **Batch Changes**
- Make multiple changes together
- Publish once to apply all
- Reduces API calls
- Minimizes disruption

### Security Best Practices

🔒 **Principle of Least Privilege**
- Grant minimum necessary access
- Default to restricted, not open
- Review "Sees All" permissions regularly
- Audit executive access

🔒 **Regular Audits**
- Export permissions monthly
- Review access patterns
- Identify anomalies
- Update as needed

🔒 **Change Management**
- Document permission changes
- Get approval for major changes
- Test in non-production first
- Have rollback plan ready

---

## Troubleshooting

### Common Issues

#### Permission Status Issues

**Permissions Stuck in PENDING Status**
- ❌ Forgot to click Publish button
- ❌ Publishing workflow not started
- ✅ Solution: Click "Publish" button to apply changes to QuickSight

**Permissions Show FAILED Status**
- ❌ Publishing workflow encountered an error
- ❌ Specific permission has invalid data
- ❌ User/group no longer exists
- ❌ Field name doesn't match DataSet
- ❌ Field value format incorrect
- ❌ Special characters causing issues
- ✅ Solution: 
  - Check CloudWatch logs for specific error message
  - Verify user/group still exists in QuickSight
  - Confirm field names match DataSet schema exactly (case-sensitive)
  - Check for special characters in values (commas, quotes)
  - Verify field data types (strings, numbers, dates)
  - Edit permission to fix the issue
  - Delete and recreate if editing doesn't work
  - Republish to retry

**Common FAILED Permission Causes**:
1. **User Deleted** - User was removed from QuickSight after permission created
2. **Field Renamed** - DataSet field was renamed or removed
3. **Invalid Characters** - Values contain special characters that break CSV format
4. **Data Type Mismatch** - Trying to filter date fields (not supported)
5. **Empty Values** - Field or value is empty/null
6. **Encoding Issues** - Special characters not properly encoded

**Permissions Show MANUAL Status**
- ℹ️ This is expected for un-manageable DataSets
- ℹ️ DataSet cannot be managed via QuickSight API
- ℹ️ Common for file upload DataSets
- ✅ Solution:
  - **This is normal** - MANUAL status is permanent for un-manageable DataSets
  - **Use the workflow**: Create permissions → Download CSV → Upload to QuickSight
  - **To enable automation**: Recreate DataSet using standard data source (not file upload)
  - **Alternative**: Continue using MANUAL workflow (RLS Manager still helps)

**Mix of PUBLISHED and PENDING Permissions**
- ✅ This is normal - you have unpublished changes
- ✅ PUBLISHED permissions are active in QuickSight
- ✅ PENDING permissions are waiting to be published
- ✅ Solution: Review pending changes and publish when ready

#### Publishing Issues

**Publishing Fails at Step 0 (Validation)**
- ❌ AWS resources don't exist
- ❌ IAM permissions insufficient
- ❌ DataSet not manageable
- ✅ Solution: Check [Initialization](Initialization.md) completed successfully

**Publishing Fails at Step 1 (S3)**
- ❌ S3 bucket not accessible
- ❌ Permissions missing
- ❌ Bucket policy blocking access
- ✅ Solution: Verify S3 permissions in IAM

**Publishing Fails at Step 3 (RLS DataSet)**
- ❌ SPICE capacity full
- ❌ DataSource not accessible
- ❌ Glue table issues
- ✅ Solution: Check SPICE capacity, verify DataSource

**Publishing Fails at Step 4 (Apply RLS)**
- ❌ DataSet locked by another operation
- ❌ DataSet configuration incompatible
- ❌ Permissions insufficient
- ✅ Solution: Wait and retry, check DataSet settings

**Publishing Fails at Step 99 (Ingestion)**
- ❌ SPICE ingestion timeout
- ❌ Data source connectivity issues
- ❌ Large dataset taking too long
- ✅ Solution: Check QuickSight console for ingestion status

**RLS Not Working After Publishing**
- ❌ User names don't match exactly
- ❌ Field names incorrect
- ❌ Values case-sensitive mismatch
- ❌ SPICE ingestion not complete
- ✅ Solution: Verify exact matches, wait for ingestion

**Users/Groups Not Appearing**
- ❌ Data not refreshed
- ❌ Users/groups don't exist in QuickSight
- ❌ Management Region incorrect
- ✅ Solution: Refresh data, verify QuickSight setup

### Getting Help

- 📖 Review [Troubleshooting Guide](TheGuide.md#troubleshooting)
- 📊 Check CloudWatch logs for detailed errors
- 🔍 Verify [Architecture](Amplify-Resources.md) components
- ❓ See [FAQ](TheGuide.md#frequently-asked-questions)

---

## Next Steps

Now that you know how to manage permissions:

1. 🎯 **Create Your First Permission** - Start with a simple test
2. 🚀 **Publish and Verify** - Ensure RLS works correctly
3. 📊 **Monitor Usage** - Track SPICE capacity and performance
4. 🔄 **Iterate** - Refine permissions based on feedback
5. 📚 **Explore Advanced Features** - Version control, bulk import, etc.

### Additional Resources

- [Installation Guide](Install.md)
- [Initialization Guide](Initialization.md)
- [Complete Guide](TheGuide.md)
- [Architecture Details](Amplify-Resources.md)

**Questions?** Check the [FAQ](TheGuide.md#frequently-asked-questions) or review the [Troubleshooting Guide](TheGuide.md#troubleshooting).
