// NEW
import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Badge, BreadcrumbGroup, Container, ContentLayout, CopyToClipboard, 
  FormField, Header, KeyValuePairs, Popover, Select, SpaceBetween, TextContent, Table, Input, Box, 
  Button,
  ButtonDropdown,
  Icon,
  Modal,
  Link,
  ProgressBar,
  ExpandableSection,
  Toggle,
  Spinner,
  Alert,
  StatusIndicator,
  StatusIndicatorProps,
  Steps,} from "@cloudscape-design/components";
import { REGION_OPTIONS } from "../hooks/REGION_OPTIONS";

import { useHelpPanel } from '../contexts/HelpPanelContext';
import { generateCSVOutput } from "../hooks/generateCSVOutput";
import { CodeView } from "@cloudscape-design/code-view";

import { publishQSRLSPermissions } from "../hooks/publishQSRLSPermissions"
import { parseRLSCSV } from "../hooks/parseRLSCSV"
import { isDateType } from "../utils/fieldTypeHelpers"

import { StepStatus } from '../hooks/STEP_STATUS'
import { useSearchParams } from "react-router-dom";

const client = generateClient<Schema>();

interface DataSetType {
  dataSetArn: string;
  dataSetId: string;
  name: string;
  rlsEnabled: string;
  importMode: string;
  lastUpdatedTime: string;
  createdTime: string;
  fieldTypes?: string; // JSON string: Object map of field name to type
  rlsDataSetId: string;
  rlsToolManaged: boolean;
  spiceCapacityInBytes: number;
  isRls: boolean;
  newDataPrep: boolean;
  apiManageable: boolean;
  toolCreated: boolean;
}

interface RegionSetType {
  regionName: string;
  availableCapacityInGB: number,
  usedCapacityInGB: number,
  datasetsCount: number,
  s3BucketName: string,
  glueDatabaseName: string,
  qsDataSource: string,
  toolCreatedCount: number,
  notManageableDatasetsCount: number,
}

interface SelectedDataset {
  value: string;
  label: string;
  apiManageable?: boolean;
  description?: string;
  dataSetArn: string;
  dataSetId: string;
  dataSetName: string;
  region: string;
  fieldTypes?: string; // JSON string: Object map of field name to type
  rlsToolManaged: boolean; 
  rlsDataSetId: string;
  rlsEnabled: string;
  rlsS3Key?: string;
  rlsS3BucketName?: string;
  lastUpdatedTime: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface AlertMessage {
  type: 'error' | 'warning' | 'success' | 'info';
  header: string;
  message: string;
}

interface PermissionItem {
  userGroup: string;
  name: string;
  arn: string;
  field: string;
  values: string;
  permissionId: string;
  createdAt?: string;
  status?: string;
  lastPublishedAt?: string;
  children?: PermissionItem[];
}

function AddPermissionPage() {
  /**
   * VARIABLES
   */
  // Context
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  const [searchParams] = useSearchParams();

  // Users / Groups List. This info are independant from the values selected in the Forms
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Data Selection Form
  const [regionsList, setRegionsList] = useState<RegionSetType[] | null>([])  // The list of the Available Regions (the ones managed by the tool)
  const [selectedRegion, setSelectedRegion] = useState<{ value: string, label: string, description: string } | null>(null); // The Region selected, used to extract only the related DataSets
  const [selectedRegionDetails, setselectedRegionDetails] = useState<RegionSetType | null>() 

  const [datasetsList, setDatasetsList] = useState<any[]>([]);  // All the DataSets available for the selectedRegion
  const [datasetOptions, setDatasetOptions] = useState<any[]>([]); // DataSet List in option format for the Select DataSet
  const [selectedDataset, setSelectedDataset] = useState<SelectedDataset | null>(null); // The DataSet 
  // selected at a specific moment
  const [formDataSetSelectDisabled, setFormDataSetSelectDisabled] = useState<boolean>(true);

  const [noDataSetFoundWarning, setNoDataSetFoundWarning] = useState<string>("") // Text to be shown if, once selected a Region, there are no datasets available
  
  // Permissions
  const [permissionsList, setPermissionsList] = useState<any[]>([]); // List of the Permissions available for a given DataSet
  const [permissionTableLoading, setPermissionTableLoading] = useState<boolean>(false);  // States if the Permission Table is in Loading phase

  // Modal Form
  const [modalVisible, setModalVisible] = useState<boolean>(false); // Set the Modal to visible or not

  const [selectedUserGroup, setSelectedUserGroup] = useState<SelectOption | null>(null);

  const [formUserGroupListSelectDisabled, setFormUserGroupListSelectDisabled] = useState<boolean>(true);
  const [selectedUserGroupArn, setSelectedUserGroupArn] = useState<SelectOption | null>(null);
  const [selectedUserGroupWarningText, setSelectedUserGroupWarningText] = useState<string>("")

  const [formSeesAllDisabled, setFormSeesAllDisabled] = useState<boolean>(true);
  const [seesAll, setSeesAll] = useState<boolean>(false);
  const [seesAllWarningText, setSeesAllWarningText] = useState<string>("")

  const [formFieldSelectDisabled, setFormFieldSelectDisabled] = useState<boolean>(true);
  const [selectedField, setSelectedField] = useState<SelectOption | null>(null);

  const [formFilterValueInputDisabled, setFormFilterValueInputDisabled] = useState<boolean>(true);
  const [filterValues, setFilterValues] = useState<string>("")
  const [rowRLSValueAftedEdit, setRowRLSValueAftedEdit] = useState<string>("")

  const [existingPermissionEdit, setExistingPermissionEdit] = useState<any>([]);

  const [filterValuesWarningText, setFilterValuesWarningText] = useState<string>("")
  const [modalErrorText, setModalErrorText] = useState<AlertMessage | null>(null)

  const [newPermissionButtonDisabled, setNewPermissionButtonDisabled] = useState<boolean>(true);

  // CSV + Code View
  const [codeViewLoading, setCodeViewLoading] = useState<boolean>(false);
  const [seeCSVOutput, setSeeCSVOutput] = useState<boolean>(false);
  const [csvOutput, setCsvOutput] = useState<string>("");

  // Publish to QS
  const [publishQSRLSDisabled, setPublishQSRLSDisabled] = useState<boolean>(true);
  const [publishQSRLSLoading, setPublishQSRLSLoading] = useState<boolean>(false);


  const [loading, setLoading] = useState<boolean>(false);

  const [expandedItems, setExpandedItems] = useState<readonly PermissionItem[]>([]);

  const [statusIndicator, setStatusIndicator] = useState<{status: string, message: string}>({status: "success", message: "ok"})
  const [permissionStatusIndicator, setPermissionStatusIndicator] = useState<{status: string, message: string}>({status: "success", message: "ok"})
  const [logs, setLogs] = useState<string>("")
  const [errorsCount, setErrorsCount] = useState<number>(0)
  const [warningsCount, setWarningsCount] = useState<number>(0)

  // Current action type for dynamic steps
  const [currentAction, setCurrentAction] = useState<'publish' | 'import' | 'visibility' | 'remove' | 'add' | null>(null);

  // Version History
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [versionHistoryLoading, setVersionHistoryLoading] = useState<boolean>(false);
  const [rollbackModalVisible, setRollbackModalVisible] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [versionPreviewModalVisible, setVersionPreviewModalVisible] = useState<boolean>(false);
  const [versionPreviewContent, setVersionPreviewContent] = useState<string>('');
  const [versionPreviewLoading, setVersionPreviewLoading] = useState<boolean>(false);

  // Function to get dynamic steps based on action
  const getStepsForAction = () => {
    switch (currentAction) {
      case 'publish':
        return [
          { status: step0_validating, header: "1. Validating RLS Tool Resources" },
          { status: step1_s3, header: "2. Publishing Permissions to S3" },
          { status: step2_glue, header: "3. Updating Glue Database" },
          { status: step3_publishingRLS, header: "4. Updating RLS DataSet in QuickSight" },
          { status: step4_updatingMainDataSet, header: "5. Applying RLS to Main DataSet" },
          { status: step5_refreshingRlsTool, header: "6. Refreshing RLS Tool" }
        ];
      case 'import':
        return [
          { status: step0_validating, header: "1. Parsing CSV File" },
          { status: step1_s3, header: "2. Validating Users/Groups" },
          { status: step2_glue, header: "3. Importing Permissions to Database" }
        ];
      case 'visibility':
        return [
          { status: step0_validating, header: "1. Validating RLS Dataset" },
          { status: step1_s3, header: "2. Updating Dataset Visibility" },
          { status: step2_glue, header: "3. Refreshing Permissions" }
        ];
      case 'remove':
        return [
          { status: step0_validating, header: "1. Deleting Permissions from Database" },
          { status: step1_s3, header: "2. Deleting S3 Folder" },
          { status: step2_glue, header: "3. Deleting Glue Table" },
          { status: step3_publishingRLS, header: "4. Deleting QuickSight RLS Dataset" },
          { status: step4_updatingMainDataSet, header: "5. Removing RLS from Main Dataset" },
          { status: step5_refreshingRlsTool, header: "6. Updating Database Record" }
        ];
      case 'add':
        return [
          { status: step0_validating, header: "1. Validating Permission Data" },
          { status: step1_s3, header: "2. Creating Permission in Database" }
        ];
      default:
        return [
          { status: step0_validating, header: "1. Validating RLS Tool Resources" },
          { status: step1_s3, header: "2. Publishing Permissions to S3" },
          { status: step2_glue, header: "3. Updating Glue Database" },
          { status: step3_publishingRLS, header: "4. Updating RLS DataSet in QuickSight" },
          { status: step4_updatingMainDataSet, header: "5. Applying RLS to Main DataSet" },
          { status: step5_refreshingRlsTool, header: "6. Refreshing RLS Tool" }
        ];
    }
  };

  // Steps step5_updatingMainDataSet,
  const [step0_validating, set_step0_validating] = useState<StepStatus>(StepStatus.STOPPED)
  const [step1_s3, set_step1_s3] = useState<StepStatus>(StepStatus.STOPPED)
  const [step2_glue, set_step2_glue] = useState<StepStatus>(StepStatus.STOPPED)
  const [step3_publishingRLS, set_step3_publishingRLS] = useState<StepStatus>(StepStatus.STOPPED)
  const [step4_updatingMainDataSet, set_step4_updatingMainDataSet] = useState<StepStatus>(StepStatus.STOPPED)
  const [step5_refreshingRlsTool, set_step5_refreshingRlsTool] = useState<StepStatus>(StepStatus.STOPPED)

  // Helper function to reset all steps
  const resetAllSteps = () => {
    set_step0_validating(StepStatus.STOPPED);
    set_step1_s3(StepStatus.STOPPED);
    set_step2_glue(StepStatus.STOPPED);
    set_step3_publishingRLS(StepStatus.STOPPED);
    set_step4_updatingMainDataSet(StepStatus.STOPPED);
    set_step5_refreshingRlsTool(StepStatus.STOPPED);
  };

  // Last Updated
  const [ permissionLastUpdate, setPermissionLastUpdate ] = useState<Date>(new Date(0))

  // RLS Dataset Visibility Management
  const [rlsVisibilityModalVisible, setRlsVisibilityModalVisible] = useState<boolean>(false);
  const [rlsVisibilityList, setRlsVisibilityList] = useState<any[]>([]);
  const [selectedVisibilityType, setSelectedVisibilityType] = useState<SelectOption | null>(null);
  const [selectedVisibilityUserGroup, setSelectedVisibilityUserGroup] = useState<SelectOption | null>(null);
  const [selectedPermissionLevel, setSelectedPermissionLevel] = useState<SelectOption | null>(null);
  const [visibilityUserGroupOptions, setVisibilityUserGroupOptions] = useState<SelectOption[]>([]);
  const [savingVisibility, setSavingVisibility] = useState<boolean>(false);

  // CSV Import
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false);
  const [importedPermissions, setImportedPermissions] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importFormat, setImportFormat] = useState<string>('');
  const [importingPermissions, setImportingPermissions] = useState<boolean>(false);
  const [editingImportRow, setEditingImportRow] = useState<number | null>(null);

  // Remove All Permissions
  const [removeAllModalVisible, setRemoveAllModalVisible] = useState<boolean>(false);
  const [removeAllConfirmText, setRemoveAllConfirmText] = useState<string>('');
  const [removingAllPermissions, setRemovingAllPermissions] = useState<boolean>(false);

  // Publish RLS Modal
  const [publishModalVisible, setPublishModalVisible] = useState<boolean>(false);
  const [publishComplete, setPublishComplete] = useState<boolean>(false);
  const [publishHasErrors, setPublishHasErrors] = useState<boolean>(false);
  
  // API Limitations Alert
  const [apiLimitationsAlertDismissed, setApiLimitationsAlertDismissed] = useState<boolean>(false);
  
  // Copy Permissions Modal
  const [copyPermissionsModalVisible, setCopyPermissionsModalVisible] = useState<boolean>(false);
  const [copyFromDataset, setCopyFromDataset] = useState<SelectedDataset | null>(null);
  const [copyFromPermissions, setCopyFromPermissions] = useState<any[]>([]);
  const [copyingPermissions, setCopyingPermissions] = useState<boolean>(false);
  const [incompatiblePermissions, setIncompatiblePermissions] = useState<Set<number>>(new Set());

  /**
   * Add Log to output text area
   * type can be ERROR or WARNING
   */
    const addLog = (log: string, type?: string, errorCode?: number, errorName?: string) => {
      setLogs((prevLogs) => {
        if( type && (type ==='ERROR' || type ==='WARNING')){
          if( type ==='ERROR'){
            setErrorsCount((prevCount) => prevCount + 1)
          }else{
            setWarningsCount((prevCount) => prevCount + 1)
          }
          if( errorCode && errorName ){
            type = type + "-" + errorCode + " " + errorName
          }
          log = `[${type}] ${log}`
  
        }else{
          log = `[INFO] ${log}`
        }
        if( prevLogs === ""){
          return log
        }
        const newLogs = `${prevLogs}\n${log}`;
        return newLogs;
      });
    };
  /**
   * FETCH MANAGED REGIONS
   */
  const fetchRegions = async () => {
    try {
      const response = await client.models.ManagedRegion.list();
      if(response.data){
        setRegionsList(response.data)
      }else{
        setRegionsList([])
        addLog("Error Fetching Regions. Try reloading the page or adding Regions in the Global Settings page.", "ERROR", 404, "NoRegionsFound")
        throw new Error("No regions found");
      }

    } catch (err) {
      console.error('Error fetching regions:', err);
      return [];
    }
  }

  /**
   * DATA SET FETCH 
   */
  const fetchDatasets = async (managedRegion: string) => {
    setLoading(true);
    setSelectedDataset(null)
    setFilterValuesWarningText("")
    try {
      const response = await client.models.DataSet.list({
        filter: {
            toolCreated: {
              eq: false
            },
            dataSetRegion: {
              eq: managedRegion
            }
        }
      });
      setDatasetsList(response.data);

      let datasetOptionsMap = response.data.map((dataset: any) => ({
        value: dataset.dataSetId,
        label: dataset.name,
        tags: [dataset.dataSetId, "RLS: "+dataset.rlsEnabled],
        labelTag: dataset.apiManageable === false ? "⚠" : "",
        description: dataset.apiManageable === false 
          ? "Direct file upload - Manual RLS required" 
          : "API manageable"
      }))

      datasetOptionsMap.sort((a: any, b: any) => {
        const labelA = a.label.toLowerCase();
        const labelB = b.label.toLowerCase();
        if (labelA < labelB) {
          return -1;
        }
        if (labelA > labelB) {
          return 1;
        }
        return 0;
      });

      setDatasetOptions(datasetOptionsMap)

      if(datasetOptionsMap.length == 0){
        setFormDataSetSelectDisabled(true)
        setNoDataSetFoundWarning("No DataSet found for region " + managedRegion + ". Check the DataSets List to see details for this Region.")
        return
      }else{
        setNoDataSetFoundWarning("")
      }

      setFormDataSetSelectDisabled(false)

    } catch (err) {
      addLog("Error Fetching DataSets. Try reloading the page or doing Initialization in Global Settings page.", "ERROR", 404, "NoDataSetsFound")
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDatasetDetails = (): DataSetType | null => {
    if (!selectedDataset?.value || !datasetsList) return null;
    return datasetsList.find(dataset => dataset.dataSetId === selectedDataset.value) || null;
  };

  /**
   *  Fetch Groups and Users
   */
  const fetchUsers = async () => {
    try {
      const response = await client.models.UserGroup.list({
        filter: {
          userGroup: {
            eq: 'User'
          }
        }
      });
      setUsers(response.data);
    } catch (err) {
      addLog("Error Fetching QuickSight Users. Try reloading the page launching Initialization again in Global Settings.", "ERROR", 404, "NoUsersFound")
      console.error('Error fetching users:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await client.models.UserGroup.list({
        filter: {
          userGroup: {
            eq: 'Group'
          }
        }
      });
      setGroups(response.data);
    } catch (err) {
      addLog("Error Fetching QuickSight Groups. Try reloading the page launching Initialization again in Global Settings.", "ERROR", 404, "NoGroupsFound")
      console.error('Error fetching groups:', err);
    }
  };

  /**
   * PERMISSION MANAGEMENT
   */

  // Fetch permissions once a dataset is selected.
  const fetchPermissions = async () => {
    if (!selectedDataset?.dataSetArn) return; // Check for dataSetArn
    
    try {
      setPermissionTableLoading(true);
      setPermissionsList([])
      const response = await client.models.Permission.list({
        filter: {
          dataSetArn: {
            eq: selectedDataset.dataSetArn
          }
        }
      });

      // Sort the permissions by userGroupArn
      const sortedPermissions = response.data.sort((a, b) => {
      // Handle cases where userGroupArn might be undefined
      const groupA = a.userGroupArn || '';
      const groupB = b.userGroupArn || '';
      return groupA.localeCompare(groupB);
    });
      setPermissionsList(sortedPermissions);
    } catch (err) {
      addLog("Error Fetching Permissions. Try refreshing the table.", "ERROR", 500, "NoPermissionFound")
      console.error('Error fetching permissions:', err);
    } finally{
      setPermissionTableLoading(false);
    }
  };
  
  // Fetch Version History
  const fetchVersionHistory = async () => {
    if (!selectedDataset?.dataSetId || !selectedRegionDetails?.s3BucketName) {
      console.log('Cannot fetch version history - missing dataSetId or s3BucketName', {
        dataSetId: selectedDataset?.dataSetId,
        s3BucketName: selectedRegionDetails?.s3BucketName
      });
      return;
    }
    
    setVersionHistoryLoading(true);
    try {
      console.log('Fetching version history for:', {
        region: selectedDataset.region,
        dataSetId: selectedDataset.dataSetId,
        s3BucketName: selectedRegionDetails.s3BucketName
      });

      const response = await client.queries.listPublishHistory({
        region: selectedDataset.region,
        dataSetId: selectedDataset.dataSetId,
        s3BucketName: selectedRegionDetails.s3BucketName
      });

      console.log('Version history response:', response);

      if (response.data?.statusCode === 200 && response.data.versions) {
        const versions = JSON.parse(response.data.versions);
        console.log('Parsed versions:', versions);
        setVersionHistory(versions);
      } else {
        console.log('No versions or error:', response.data);
      }
    } catch (err) {
      console.error('Error fetching version history:', err);
    } finally {
      setVersionHistoryLoading(false);
    }
  };

  // Preview Version (READ-ONLY - does not create new version)
  const handlePreviewVersion = async (versionId: string) => {
    if (!selectedDataset?.dataSetId || !selectedRegionDetails?.s3BucketName) return;
    
    setVersionPreviewLoading(true);
    setVersionPreviewModalVisible(true);
    
    try {
      // Use getVersionContent instead of rollbackToVersion - READ ONLY!
      const response = await client.queries.getVersionContent({
        region: selectedDataset.region,
        dataSetId: selectedDataset.dataSetId,
        s3BucketName: selectedRegionDetails.s3BucketName,
        versionId: versionId
      });

      if (response.data?.statusCode === 200 && response.data.csvContent) {
        const csvContent = response.data.csvContent;
        setVersionPreviewContent(csvContent);
        
        // Parse CSV to show as table
        const result = parseRLSCSV(csvContent, users, groups, selectedDataset?.fieldTypes);
        setImportedPermissions(result.permissions);
        setImportFormat(result.format);
        setImportErrors(result.errors);
        setImportWarnings(result.warnings);
      } else {
        setVersionPreviewContent('Failed to load version: ' + response.data?.message);
        setImportedPermissions([]);
      }
    } catch (err) {
      console.error('Error previewing version:', err);
      setVersionPreviewContent('Error loading version: ' + err);
      setImportedPermissions([]);
    } finally {
      setVersionPreviewLoading(false);
    }
  };

  // Rollback to Version
  const handleRollback = async (versionId: string) => {
    if (!selectedDataset?.dataSetId || !selectedRegionDetails?.s3BucketName) return;
    
    try {
      addLog(`Rolling back to version ${versionId}...`);
      
      const response = await client.queries.rollbackToVersion({
        region: selectedDataset.region,
        dataSetId: selectedDataset.dataSetId,
        s3BucketName: selectedRegionDetails.s3BucketName,
        versionId: versionId
      });

      if (response.data?.statusCode === 200 && response.data.csvContent) {
        addLog('Version restored successfully. Importing permissions...');
        
        // Parse and import the CSV content
        const csvContent = response.data.csvContent;
        const result = parseRLSCSV(csvContent, users, groups, selectedDataset?.fieldTypes);
        
        if (result.permissions && result.permissions.length > 0) {
          setImportedPermissions(result.permissions);
          setImportFormat(result.format);
          setImportErrors(result.errors);
          setImportWarnings(result.warnings);
          setImportModalVisible(true);
          
          addLog(`Restored ${result.permissions.length} permissions from version. Review and publish to apply.`, 'INFO');
        } else {
          addLog('Failed to parse restored CSV: ' + result.errors.join(', '), 'ERROR');
        }
        
        setRollbackModalVisible(false);
        fetchVersionHistory(); // Refresh history
      } else {
        addLog('Failed to rollback: ' + response.data?.message, 'ERROR');
      }
    } catch (err) {
      console.error('Error rolling back version:', err);
      addLog('Error rolling back version: ' + err, 'ERROR');
    }
  };

  // Edit Permission
  const permissionRowEdit = async (selectedRowElement: any) => {
    try{
      if(selectedDataset == null){
        throw new Error("No dataset selected");
      }

      const response = await client.models.Permission.update({
        id: selectedRowElement.id,
        dataSetArn: selectedRowElement.dataSetArn,
        userGroupArn: selectedRowElement.arn,
        field: selectedRowElement.field,
        rlsValues: selectedRowElement.field_values,
      })
      if( response?.errors ){
        throw new Error(response.errors[0].message);
      }
      fetchPermissions()
    } catch (err) {
      console.error('Error updating permission:', err);
    } 
  }

  // Delete Permission
  const permissionRowDelete = async (permissionId: string) => {
    try{
      if(permissionId == null){
        throw new Error("No permission selected to be removed");
      }

      const response = await client.models.Permission.delete({
        id: permissionId,
      })
      if( response?.errors ){
        throw new Error(response.errors[0].message);
      }
      fetchPermissions()
    } catch (err) {
      console.error('Error deleting permission:', err);
    }
  }

  // Fetch permissions from another dataset
  const fetchPermissionsFromDataset = async (dataSetArn: string) => {
    try {
      const response = await client.models.Permission.list({
        filter: {
          dataSetArn: {
            eq: dataSetArn
          }
        }
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching permissions:', err);
      return [];
    }
  };

  // Copy permissions from another dataset
  const copyPermissionsFromDataset = async () => {
    if (!copyFromDataset || !selectedDataset) return;
    
    setCopyingPermissions(true);
    try {
      // Filter out incompatible permissions (those with fields not in destination dataset)
      const compatiblePermissions = copyFromPermissions.filter((_, index) => !incompatiblePermissions.has(index));
      const skippedCount = copyFromPermissions.length - compatiblePermissions.length;
      
      addLog(`Copying ${compatiblePermissions.length} permission(s) from ${copyFromDataset.label} to ${selectedDataset.label}...`);
      if (skippedCount > 0) {
        addLog(`⚠ Skipping ${skippedCount} incompatible permission(s) (fields not available in destination dataset)`, 'WARNING');
      }
      
      // Determine status based on target dataset API manageability
      const permissionStatus = selectedDataset.apiManageable === false ? 'MANUAL' : 'PENDING';
      
      for (const perm of compatiblePermissions) {
        await client.models.Permission.create({
          dataSetArn: selectedDataset.dataSetArn,
          userGroupArn: perm.userGroupArn,
          field: perm.field,
          rlsValues: perm.rlsValues,
          status: permissionStatus
        });
      }
      
      addLog(`✓ Successfully copied ${compatiblePermissions.length} permission(s)`);
      
      // Refresh permissions list
      await fetchPermissions();
      
      // Close modal and reset
      setCopyPermissionsModalVisible(false);
      setCopyFromDataset(null);
      setCopyFromPermissions([]);
      setIncompatiblePermissions(new Set());
      
    } catch (err) {
      console.error('Error copying permissions:', err);
      addLog('Error copying permissions: ' + err, 'ERROR', 500, 'CopyPermissionsError');
    } finally {
      setCopyingPermissions(false);
    }
  };

  // Delete All Permissions for a User/Group (for the current dataset only)
  const deleteAllPermissionsForUserGroup = async (userGroupArn: string, dataSetArn: string) => {

    const listToDelete = await client.models.Permission.list(
      {filter:
        {
          userGroupArn: {
            eq: userGroupArn
          },
          dataSetArn: {
            eq: dataSetArn
          }
        }
      }
    )

    for( const permission of listToDelete.data){
      await client.models.Permission.delete({
        id: permission.id,
      })
    }

  }

  // Create new Permission

  const permissionCreate = async (dataSetArn: string, userGroupArn: string, field: string, rlsValues: string) => {
    setCurrentAction('add');
    resetAllSteps();
    try{
      // Step 1: Validate permission data
      set_step0_validating(StepStatus.LOADING);
      addLog('[STEP 1/2] Validating permission data...');
      
      if( rlsValues === ""  ){
        set_step0_validating(StepStatus.ERROR);
        throw new Error("No values for filters provided");
      }
      if( field === "" ){
        set_step0_validating(StepStatus.ERROR);
        throw new Error("No field selected");
      }
      if( userGroupArn === "" ){
        set_step0_validating(StepStatus.ERROR);
        throw new Error("No group/user entity selected");
      }
      
      // Validate field is not a date type
      if (selectedDataset?.fieldTypes) {
        try {
          const fieldTypesMap = JSON.parse(selectedDataset.fieldTypes);
          const fieldType = fieldTypesMap[field];
          if (fieldType && isDateType(fieldType)) {
            set_step0_validating(StepStatus.ERROR);
            addLog(`Field "${field}" is a ${fieldType} type. Date fields are not supported for RLS.`, 'ERROR');
            throw new Error(`Date fields cannot be used for RLS rules. Field "${field}" is type ${fieldType}.`);
          }
        } catch (parseError) {
          console.warn('Could not validate field type:', parseError);
        }
      }
      
      if( dataSetArn === ""){
        set_step0_validating(StepStatus.ERROR);
        throw new Error("No dataset selected");
      }
      
      addLog('✓ Permission data validated');
      set_step0_validating(StepStatus.SUCCESS);

      // Step 2: Create permission in database
      set_step1_s3(StepStatus.LOADING);
      addLog('[STEP 2/2] Creating permission in database...');
      
      // Determine status based on dataset API manageability
      const permissionStatus = selectedDataset?.apiManageable === false ? 'MANUAL' : 'PENDING';
      
      const response = await client.models.Permission.create({
        dataSetArn: dataSetArn,
        userGroupArn: userGroupArn,
        field: field,
        rlsValues: rlsValues,
        status: permissionStatus,
      })
      
      if( response?.errors ){
        set_step1_s3(StepStatus.ERROR);
        addLog(`✗ Failed to create permission: ${response.errors[0].message}`, 'ERROR');
        throw new Error(response.errors[0].message);
      }
      
      addLog('✓ Permission created successfully');
      set_step1_s3(StepStatus.SUCCESS);
      
      setModalVisible(false)
      fetchPermissions()
    } catch (err: any) {
      console.error('Error creating permission:', err);
      addLog(`✗ Error: ${err?.message || err}`, 'ERROR');
    }

  }

  // Validate RLS Filter Values
  const validateFilterValues = (value: string) => {
    // Regex explanation:
    // ^                      Start of string
    // [a-zA-Z0-9]+          One or more letters/numbers
    // (?:                    Start non-capturing group
    //   \s*,\s*             Comma with optional spaces around it
    //   [a-zA-Z0-9]+        One or more letters/numbers
    // )*                     End group, repeat 0 or more times
    // $                      End of string
    const validFormat = /^(?:\*|[a-zA-Z0-9\-_\/\\]+(?:,[a-zA-Z0-9\-_\/\\]+)*)$/;
    
    return validFormat.test(value);
  };
  // Format Bytes
  const formatBytes = (bytes: number): string => {
    const k = 1024;
    
    if (bytes < 100 * k) { // Less than 100KB
      return `${(bytes / k).toFixed(2)} KB`;
    } else if (bytes < 1000 * k * k) { // Less than 1000MB
      return `${(bytes / (k * k)).toFixed(2)} MB`;
    } else if (bytes < 1000 * k * k * k) { // Less than 1000GB
      return `${(bytes / (k * k * k)).toFixed(2)} GB`;
    } else {
      return `${(bytes / (k * k * k * k)).toFixed(2)} TB`;
    }
  };

  /**
   * RESET
   */

  const resetModal = async () => {
    setSelectedUserGroup(null)
    setFormUserGroupListSelectDisabled(true)
    setFormFieldSelectDisabled(true)
    setFormSeesAllDisabled(true)
    setNewPermissionButtonDisabled(true)

    resetAfterUserGroupTypeChoiche()
  }

  const resetAll = async () => {
    resetModal()
    setPermissionsList([])
    setSelectedDataset(null)
    setDatasetOptions([])
    setDatasetsList([])
    setNoDataSetFoundWarning("")
    setCsvOutput("")
  }

  const resetAfterUserGroupTypeChoiche = async () => {
    setSelectedUserGroupArn(null)
    setFormUserGroupListSelectDisabled(true)
    setSeesAll(false)
    setSelectedField(null)
    setFilterValues("")

    setFormSeesAllDisabled(true)
    setFormFieldSelectDisabled(true)
    setFormFilterValueInputDisabled(true)

    setSeesAllWarningText("")
    setFilterValuesWarningText("")
    setSelectedUserGroupWarningText("")
    setModalErrorText(null)
  }
  /**
   * OUTPUTS
   */
  const refreshCSVOutput = async (dataSetArn: string) => {
    setCodeViewLoading(true)
    try {
      setCodeViewLoading(true)

      if(selectedDataset == null){
        setSeeCSVOutput(false)
      } else {
        const csvOutput = await generateCSVOutput(dataSetArn);
        setCsvOutput(csvOutput)
        setSeeCSVOutput(true)
      }

    } catch (error) {
      console.error("Error getting CSV output:", error);
      setCsvOutput("");
      setSeeCSVOutput(false);
    } finally{
      setCodeViewLoading(false)
    }
  };


  const setStep = (step: string, stepStatus: StepStatus) => {
    switch (step) {
      case "step0":
        set_step0_validating(stepStatus)
        break;
      case "step1":
        set_step1_s3(stepStatus)
        break;
      case "step2":
        set_step2_glue(stepStatus)
        break;
      case "step3":
        set_step3_publishingRLS(stepStatus)
        break;
      case "step4":
        set_step4_updatingMainDataSet(stepStatus)
        break;
      case "step5":
        set_step5_refreshingRlsTool(stepStatus)
        break;
      default:
        break;
    }
  };

  const publishQSRLSPermissionsClickHandler = async () => {
    setCurrentAction('publish');
    resetAllSteps();
    setPublishModalVisible(true);
    setPublishComplete(false);
    setPublishHasErrors(false);
    setLogs("")
    setErrorsCount(0);
    setWarningsCount(0);
    setStatusIndicator({status: "loading", message: "Publishing Permission in progress"})
  
    addLog("Publishing RLS Permissions to QuickSight")
    
    // Track errors locally to avoid state timing issues
    let hadErrors = false;
    
    try {
      setPublishQSRLSLoading(true)

      if(selectedRegion == undefined || selectedDataset == undefined){
        throw new Error("No region or dataset selected");
      }
      if(selectedRegionDetails?.s3BucketName == undefined || selectedRegionDetails?.s3BucketName === "-" ){
        throw new Error("No S3 Bucket defined for the selected region. Please check the Global Settings page");
      }

      set_step0_validating(StepStatus.STOPPED)
      set_step1_s3(StepStatus.STOPPED)
      set_step2_glue(StepStatus.STOPPED)
      set_step3_publishingRLS(StepStatus.STOPPED)
      set_step4_updatingMainDataSet(StepStatus.STOPPED)
      set_step5_refreshingRlsTool(StepStatus.STOPPED)

      if( selectedDataset.rlsToolManaged && (selectedDataset.rlsDataSetId === "" || selectedDataset.rlsDataSetId == null || selectedDataset.rlsDataSetId == undefined)){
        addLog("RLS for this DataSet is indicated as managed by RLS Tool, but the RLS DataSet ARN is empty.")
        setPublishQSRLSLoading(false)
        return
      }

      const publishResponse = await publishQSRLSPermissions( { 
        region: selectedRegion.value,
        dataSetId: selectedDataset?.dataSetId,
        dataSetArn: selectedDataset?.dataSetArn,
        s3BucketName: selectedRegionDetails.s3BucketName,
        glueDatabaseName: selectedRegionDetails.glueDatabaseName,
        qsDataSourceName: selectedRegionDetails.qsDataSource,
        csvOutput: csvOutput,
        rlsDataSetId: selectedDataset.rlsDataSetId,
        rlsToolManaged: selectedDataset.rlsToolManaged,
        addLog,
        setStep
      } )

      if(publishResponse.status != 200){
        setStatusIndicator({status:"error", message:"error"})
        addLog(publishResponse.message, "ERROR", publishResponse.status, "PublishingPermissionError")
        return
      }

      // Save current dataset info before refresh
      const currentDatasetId = selectedDataset.dataSetId;
      const currentDatasetValue = selectedDataset.value;
      
      await fetchDatasets(selectedRegion.value);

      // Mark all permissions for this dataset as PUBLISHED
      addLog('Updating permission statuses to PUBLISHED...');
      const permissionsToUpdate = permissionsList.filter(p => p.dataSetArn === selectedDataset.dataSetArn);
      for (const permission of permissionsToUpdate) {
        await client.models.Permission.update({
          id: permission.id,
          status: 'PUBLISHED',
          lastPublishedAt: new Date().toISOString()
        });
      }
      addLog(`✓ Updated ${permissionsToUpdate.length} permission(s) status`);

      // Refresh permissions list to show updated statuses
      await fetchPermissions();
      addLog('✓ Permissions list refreshed');

      // Restore selected dataset with updated data
      const updatedDatasetDetails = datasetsList.find(ds => ds.dataSetId === currentDatasetId);
      const updatedDatasetOption = datasetOptions.find(opt => opt.value === currentDatasetValue);
      
      if (updatedDatasetDetails && updatedDatasetOption) {
        const restoredDataset: SelectedDataset = {
          value: updatedDatasetOption.value || '',
          label: updatedDatasetOption.label || '',
          description: updatedDatasetOption.description,
          dataSetArn: updatedDatasetDetails.dataSetArn,
          dataSetId: updatedDatasetDetails.dataSetId,
          dataSetName: updatedDatasetDetails.name,
          region: updatedDatasetDetails.dataSetRegion,
          fieldTypes: updatedDatasetDetails.fieldTypes,
          rlsToolManaged: updatedDatasetDetails.rlsToolManaged,
          rlsDataSetId: updatedDatasetDetails.rlsDataSetId || "",
          rlsEnabled: updatedDatasetDetails.rlsEnabled,
          rlsS3Key: updatedDatasetDetails.glueS3Id,
          rlsS3BucketName: selectedRegion?.value ? regionsList?.find(r => r.regionName === selectedRegion.value)?.s3BucketName : undefined,
          lastUpdatedTime: updatedDatasetDetails.updatedAt,
          apiManageable: updatedDatasetDetails.apiManageable
        };
        setSelectedDataset(restoredDataset);
        addLog('✓ Dataset selection restored with updated data');
      }

      setStatusIndicator({status:"success", message:"Ok"})

    } catch (err) {
      console.error('Error publishing permissions:', err);
      addLog('Error publishing permissions: ' + err, "ERROR", 500, "PublishingPermissionError")
      hadErrors = true;
      setPublishHasErrors(true);
      
      // Mark ONLY PENDING permissions as FAILED (don't change already PUBLISHED ones)
      if (selectedDataset?.dataSetArn) {
        const permissionsToUpdate = permissionsList.filter(
          p => p.dataSetArn === selectedDataset.dataSetArn && p.status === 'PENDING'
        );
        for (const permission of permissionsToUpdate) {
          await client.models.Permission.update({
            id: permission.id,
            status: 'FAILED'
          });
        }
        addLog(`Marked ${permissionsToUpdate.length} pending permission(s) as FAILED`);
        
        // Refresh permissions to show updated status
        await fetchPermissions();
      }
    }finally{
      setPublishQSRLSLoading(false)
      setPublishComplete(true);
      
      // Use local error flag to decide whether to auto-close
      addLog(`Publish completed. Had errors: ${hadErrors}, Error count: ${errorsCount}, Warning count: ${warningsCount}`);
      
      if (!hadErrors && errorsCount === 0 && warningsCount === 0) {
        // Success - auto close after showing success message
        addLog('No issues detected, auto-closing modal in 2 seconds...');
        setTimeout(() => {
          setPublishModalVisible(false);
        }, 2000);
      } else {
        addLog('Issues detected, modal will remain open. Click OK to close.');
      }
    }
  
  }

  /**
   * RLS Dataset Visibility Management Functions
   */
  const openRLSVisibilityModal = async () => {
    if (!selectedDataset?.dataSetArn) return;
    
    // Fetch current visibility from database
    await fetchRLSVisibility();
    setRlsVisibilityModalVisible(true);
  };

  const fetchRLSVisibility = async () => {
    if (!selectedDataset?.dataSetArn || !selectedDataset?.rlsDataSetId || !selectedRegion) return;
    
    try {
      // Fetch from database
      const dbResponse = await client.models.RLSDataSetVisibility.list({
        filter: {
          dataSetArn: {
            eq: selectedDataset.dataSetArn
          }
        }
      });
      
      // Fetch actual permissions from QuickSight
      const rlsDataSetIdOnly = selectedDataset.rlsDataSetId.split('/').pop() || selectedDataset.rlsDataSetId;
      
      const qsResponse = await client.queries.fetchRLSDataSetPermissions({
        region: selectedRegion.value,
        rlsDataSetId: rlsDataSetIdOnly
      });
      
      let qsPermissions: any[] = [];
      if (qsResponse.data?.statusCode === 200 && qsResponse.data?.permissions) {
        qsPermissions = JSON.parse(qsResponse.data.permissions);
      }
      
      // Map QuickSight permissions to our format
      const OWNER_ACTIONS_SET = new Set([
        "quicksight:DeleteDataSet",
        "quicksight:UpdateDataSetPermissions",
        "quicksight:UpdateDataSet"
      ]);
      
      const qsPermissionsList = qsPermissions.map((perm: any) => {
        // Determine permission level based on actions
        const hasOwnerActions = perm.Actions?.some((action: string) => OWNER_ACTIONS_SET.has(action));
        const permissionLevel = hasOwnerActions ? 'OWNER' : 'VIEWER';
        
        const userGroupName = perm.Principal?.split(':')[5]?.split('/').slice(2).join('/') || '';
        const userGroupType = perm.Principal?.split(':')[5]?.split('/')[0].toUpperCase() || '';
        
        // Check if this permission exists in our database
        const dbRecord = dbResponse.data.find(item => item.userGroupArn === perm.Principal);
        
        return {
          id: dbRecord?.id || `qs-${perm.Principal}`,
          rlsDataSetArn: selectedDataset.rlsDataSetId,
          dataSetArn: selectedDataset.dataSetArn,
          userGroupArn: perm.Principal,
          permissionLevel: dbRecord?.permissionLevel || permissionLevel,
          name: userGroupName,
          userGroupType: userGroupType,
          fromQuickSight: !dbRecord, // Flag to indicate this came from QS, not our DB
          createdAt: dbRecord?.createdAt,
          updatedAt: dbRecord?.updatedAt
        };
      });
      
      setRlsVisibilityList(qsPermissionsList);
      
    } catch (error) {
      console.error('Error fetching RLS visibility:', error);
      alert('Error fetching visibility permissions: ' + error);
    }
  };

  const addVisibility = () => {
    if (!selectedVisibilityUserGroup || !selectedPermissionLevel) return;
    
    // Check if already exists
    const exists = rlsVisibilityList.some(
      item => item.userGroupArn === selectedVisibilityUserGroup.value
    );
    
    if (exists) {
      alert('This user/group already has visibility configured');
      return;
    }
    
    // Add to local state
    const newItem = {
      id: `temp-${Date.now()}`,
      rlsDataSetArn: selectedDataset?.rlsDataSetId || '',
      dataSetArn: selectedDataset?.dataSetArn || '',
      userGroupArn: selectedVisibilityUserGroup.value,
      permissionLevel: selectedPermissionLevel.value,
      name: selectedVisibilityUserGroup.label,
      userGroupType: selectedVisibilityType?.value.toUpperCase() || '',
      isNew: true
    };
    
    setRlsVisibilityList([...rlsVisibilityList, newItem]);
    
    // Reset form
    setSelectedVisibilityUserGroup(null);
    setSelectedPermissionLevel(null);
  };

  const removeVisibility = (id: string) => {
    setRlsVisibilityList(rlsVisibilityList.filter(item => item.id !== id));
  };

  const saveAndApplyVisibility = async () => {
    if (!selectedDataset?.rlsDataSetId || !selectedRegion) return;
    
    setCurrentAction('visibility');
    setErrorsCount(0);
    setWarningsCount(0);
    resetAllSteps();
    setSavingVisibility(true);
    
    try {
      // Step 1: Update database records
      set_step0_validating(StepStatus.LOADING);
      addLog('[STEP 1/3] Updating visibility records in database...');
      
      // Get current records from database
      const currentRecords = await client.models.RLSDataSetVisibility.list({
        filter: {
          dataSetArn: {
            eq: selectedDataset.dataSetArn
          }
        }
      });
      
      // Delete records that are not in the new list
      for (const record of currentRecords.data) {
        const stillExists = rlsVisibilityList.some(item => item.id === record.id);
        if (!stillExists) {
          await client.models.RLSDataSetVisibility.delete({ id: record.id });
        }
      }
      
      // Create or update records
      for (const item of rlsVisibilityList) {
        // Create new records (either new additions or items from QuickSight not in our DB)
        if (item.isNew || item.fromQuickSight) {
          await client.models.RLSDataSetVisibility.create({
            rlsDataSetArn: selectedDataset.rlsDataSetId,
            dataSetArn: selectedDataset.dataSetArn,
            userGroupArn: item.userGroupArn,
            permissionLevel: item.permissionLevel
          });
        }
      }
      
      addLog('✓ Database records updated');
      set_step0_validating(StepStatus.SUCCESS);
      
      // Step 2: Apply permissions to QuickSight
      set_step1_s3(StepStatus.LOADING);
      addLog('[STEP 2/3] Applying permissions to QuickSight RLS dataset...');
      
      const permissions = rlsVisibilityList.map(item => ({
        userGroupArn: item.userGroupArn,
        permissionLevel: item.permissionLevel
      }));
      
      const rlsDataSetIdOnly = selectedDataset.rlsDataSetId.split('/').pop() || selectedDataset.rlsDataSetId;
      
      const updateResponse = await client.queries.updateRLSDataSetPermissions({
        region: selectedRegion.value,
        rlsDataSetId: rlsDataSetIdOnly,
        permissions: JSON.stringify(permissions)
      });
      
      if (updateResponse.data?.statusCode === 200) {
        addLog('✓ QuickSight permissions updated');
        set_step1_s3(StepStatus.SUCCESS);
        
        // Step 3: Complete
        set_step2_glue(StepStatus.LOADING);
        addLog('[STEP 3/3] Finalizing...');
        addLog('✓ RLS Dataset visibility updated successfully');
        set_step2_glue(StepStatus.SUCCESS);
        
        alert('RLS Dataset visibility updated successfully!');
        setRlsVisibilityModalVisible(false);
      } else {
        addLog(`✗ Failed to update QuickSight permissions: ${updateResponse.data?.message}`, 'ERROR');
        set_step1_s3(StepStatus.ERROR);
        alert('Failed to update QuickSight permissions: ' + updateResponse.data?.message);
      }
      
    } catch (error: any) {
      console.error('Error saving visibility:', error);
      addLog(`✗ Error saving visibility: ${error?.message || error}`, 'ERROR');
      alert('Error saving visibility: ' + error);
    } finally {
      setSavingVisibility(false);
    }
  };

  /**
   * CSV Import Functions
   */
  const handleCSVFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processCSVImport(content);
    };
    reader.readAsText(file);
  };

  const processCSVImport = (csvContent: string) => {
    const result = parseRLSCSV(csvContent, users, groups, selectedDataset?.fieldTypes);
    
    setImportedPermissions(result.permissions);
    setImportErrors(result.errors);
    setImportWarnings(result.warnings);
    setImportFormat(result.format);
    
    if (result.errors.length === 0) {
      setImportModalVisible(true);
    } else {
      alert('CSV Import Failed:\n' + result.errors.join('\n'));
    }
  };

  const editImportedPermission = (index: number, field: string, value: string) => {
    const updated = [...importedPermissions];
    if (field === 'field') {
      updated[index].field = value;
    } else if (field === 'rlsValues') {
      updated[index].rlsValues = value;
    }
    setImportedPermissions(updated);
  };

  const deleteImportedPermission = (index: number) => {
    const updated = importedPermissions.filter((_, i) => i !== index);
    setImportedPermissions(updated);
  };

  const confirmImport = async () => {
    if (!selectedDataset?.dataSetArn) return;
    
    setCurrentAction('import');
    resetAllSteps();
    setImportingPermissions(true);
    
    try {
      // Step 1: Validate imported data
      set_step0_validating(StepStatus.LOADING);
      addLog('[STEP 1/3] Validating imported permissions...');
      
      const validPermissions = importedPermissions.filter(p => p.isResolved);
      
      if (validPermissions.length === 0) {
        set_step0_validating(StepStatus.ERROR);
        addLog('✗ No valid permissions to import', 'ERROR');
        alert('No valid permissions to import. Please check warnings.');
        return;
      }
      
      addLog(`✓ Validated ${validPermissions.length} permission(s)`);
      set_step0_validating(StepStatus.SUCCESS);

      // Step 2: Create permissions in database
      set_step1_s3(StepStatus.LOADING);
      addLog(`[STEP 2/3] Importing ${validPermissions.length} permission(s) to database...`);
      
      // Determine status based on dataset API manageability
      const permissionStatus = selectedDataset?.apiManageable === false ? 'MANUAL' : 'PENDING';
      
      for (const perm of validPermissions) {
        await client.models.Permission.create({
          dataSetArn: selectedDataset.dataSetArn,
          userGroupArn: perm.userGroupArn,
          field: perm.field,
          rlsValues: perm.rlsValues,
          status: permissionStatus
        });
      }
      
      addLog(`✓ Imported ${validPermissions.length} permission(s) successfully`);
      set_step1_s3(StepStatus.SUCCESS);

      // Step 3: Refresh permissions list
      set_step2_glue(StepStatus.LOADING);
      addLog('[STEP 3/3] Refreshing permissions list...');
      await fetchPermissions();
      addLog('✓ Permissions list refreshed');
      set_step2_glue(StepStatus.SUCCESS);
      
      setImportModalVisible(false);
      alert(`Successfully imported ${validPermissions.length} permission(s)!\n\nNext steps:\n1. Review the imported permissions\n2. Click "Publish RLS in QuickSight" to apply them\n3. Manually remove any existing RLS dataset link in QuickSight if needed`);
      
    } catch (error: any) {
      console.error('Error importing permissions:', error);
      addLog(`✗ Error importing permissions: ${error?.message || error}`, 'ERROR');
      alert('Error importing permissions: ' + error);
    } finally {
      setImportingPermissions(false);
    }
  };

  const removeAllPermissions = async () => {
    if (!selectedDataset?.dataSetArn || !selectedRegionDetails) return;
    
    setCurrentAction('remove');
    setErrorsCount(0);
    setWarningsCount(0);
    resetAllSteps();
    setRemovingAllPermissions(true);
    
    try {
      // Use the dataSetId of the main dataset (the one with RLS applied)
      const rlsKey = selectedDataset.dataSetId;
      
      addLog('=== Starting Remove All Permissions ===');
      addLog(`Dataset: ${selectedDataset.dataSetName} (${selectedDataset.dataSetId})`);
      addLog(`Region: ${selectedDataset.region}`);
      addLog(`RLS Dataset ID: ${selectedDataset.rlsDataSetId || 'N/A'}`);
      addLog(`RLS Key (dataSetId): ${rlsKey}`);
      addLog(`S3 Bucket: ${selectedRegionDetails.s3BucketName}`);
      addLog(`Glue Database: ${selectedRegionDetails.glueDatabaseName}`);
      addLog('');

      // 1. Delete all permissions from the data model
      set_step0_validating(StepStatus.LOADING);
      addLog('[STEP 1/6] Deleting all permissions from database...');
      const permissionsToDelete = permissionsList.filter(p => p.dataSetArn === selectedDataset.dataSetArn);
      
      for (const permission of permissionsToDelete) {
        await client.models.Permission.delete({ id: permission.id });
      }
      addLog(`✓ Deleted ${permissionsToDelete.length} permission(s) from database`);
      set_step0_validating(StepStatus.SUCCESS);

      // 2. Delete S3 folder if it exists (RLS-Datasets/dataSetId/)
      set_step1_s3(StepStatus.LOADING);
      const s3Path = `${selectedRegionDetails.s3BucketName}/RLS-Datasets/${rlsKey}/`;
      addLog(`[STEP 2/6] Deleting S3 folder: s3://${s3Path}`);
      try {
        const s3DeleteResult = await client.queries.deleteDataSetS3Objects({
          region: selectedDataset.region,
          s3Key: rlsKey,
          s3BucketName: selectedRegionDetails.s3BucketName
        });
        
        if (s3DeleteResult.data?.statusCode === 200) {
          addLog(`✓ S3 folder deleted successfully: s3://${s3Path}`);
          set_step1_s3(StepStatus.SUCCESS);
        } else if (s3DeleteResult.data?.statusCode === 404) {
          addLog(`⚠ S3 folder not found (already deleted): s3://${s3Path}`, 'WARNING');
          set_step1_s3(StepStatus.SUCCESS);
        } else {
          addLog(`✗ Failed to delete S3 folder: ${s3DeleteResult.data?.message}`, 'ERROR');
          set_step1_s3(StepStatus.ERROR);
        }
      } catch (s3Error: any) {
        addLog(`✗ Error deleting S3 folder: ${s3Error?.message || s3Error}`, 'ERROR');
        set_step1_s3(StepStatus.ERROR);
      }

      // 3. Delete Glue Table if it exists (qs-rls-{dataSetId})
      set_step2_glue(StepStatus.LOADING);
      const glueTableName = `qs-rls-${rlsKey}`;
      addLog(`[STEP 3/6] Deleting Glue Table: ${glueTableName} in database ${selectedRegionDetails.glueDatabaseName}`);
      try {
        const glueDeleteResult = await client.queries.deleteDataSetGlueTable({
          region: selectedDataset.region,
          glueKey: rlsKey,
          glueDatabaseName: selectedRegionDetails.glueDatabaseName
        });
        
        if (glueDeleteResult.data?.statusCode === 200) {
          addLog(`✓ Glue Table deleted successfully: ${glueTableName}`);
          set_step2_glue(StepStatus.SUCCESS);
        } else {
          addLog(`✗ Failed to delete Glue Table: ${glueDeleteResult.data?.message}`, 'ERROR');
          set_step2_glue(StepStatus.ERROR);
        }
      } catch (glueError: any) {
        addLog(`✗ Error deleting Glue Table: ${glueError?.message || glueError}`, 'ERROR');
        set_step2_glue(StepStatus.ERROR);
      }

      // 4. Delete QuickSight RLS dataset if it exists
      set_step3_publishingRLS(StepStatus.LOADING);
      if (selectedDataset.rlsDataSetId) {
        // Extract just the ID from the rlsDataSetId (in case it's an ARN)
        const rlsDataSetIdOnly = selectedDataset.rlsDataSetId.includes('/') 
          ? selectedDataset.rlsDataSetId.split('/').pop() 
          : selectedDataset.rlsDataSetId;
        
        addLog(`[STEP 4/6] Deleting QuickSight RLS dataset ID: ${rlsDataSetIdOnly}`);
        addLog(`  Region: ${selectedDataset.region}`);
        try {
          const qsDeleteResult = await client.queries.deleteDataSetFromQS({
            region: selectedDataset.region,
            dataSetId: rlsDataSetIdOnly || selectedDataset.rlsDataSetId
          });
          
          if (qsDeleteResult.data?.statusCode === 200) {
            addLog(`✓ QuickSight RLS dataset deleted successfully: ${rlsDataSetIdOnly}`);
            
            // Also delete the RLS dataset record from our database
            addLog(`  Deleting RLS dataset record from database...`);
            try {
              // Find the RLS dataset record in our database
              const rlsDatasetRecords = await client.models.DataSet.list({
                filter: {
                  dataSetId: { eq: rlsDataSetIdOnly },
                  isRls: { eq: true }
                }
              });
              
              if (rlsDatasetRecords.data && rlsDatasetRecords.data.length > 0) {
                for (const record of rlsDatasetRecords.data) {
                  await client.models.DataSet.delete({ dataSetArn: record.dataSetArn });
                  addLog(`  ✓ Deleted RLS dataset record: ${record.dataSetArn}`);
                }
              } else {
                addLog(`  ⚠ No RLS dataset record found in database`, 'WARNING');
              }
            } catch (dbError: any) {
              addLog(`  ✗ Error deleting RLS dataset record from database: ${dbError?.message || dbError}`, 'ERROR');
            }
            
            set_step3_publishingRLS(StepStatus.SUCCESS);
          } else {
            addLog(`✗ Failed to delete QuickSight RLS dataset: ${qsDeleteResult.data?.message}`, 'ERROR');
            addLog(`  Error details: ${JSON.stringify(qsDeleteResult.data)}`, 'ERROR');
            set_step3_publishingRLS(StepStatus.ERROR);
          }
        } catch (qsError: any) {
          addLog(`✗ Error deleting QuickSight RLS dataset: ${qsError?.message || qsError}`, 'ERROR');
          addLog(`  Full error: ${JSON.stringify(qsError)}`, 'ERROR');
          set_step3_publishingRLS(StepStatus.ERROR);
        }
      } else {
        addLog('[STEP 4/6] Skipping QuickSight RLS dataset deletion - no rlsDataSetId found', 'WARNING');
        set_step3_publishingRLS(StepStatus.SUCCESS);
      }

      // 5. Remove RLS configuration from main dataset
      set_step4_updatingMainDataSet(StepStatus.LOADING);
      addLog(`[STEP 5/6] Removing RLS configuration from main dataset: ${selectedDataset.dataSetId}`);
      const removeRLSResult = await client.queries.removeRLSDataSet({
        region: selectedDataset.region,
        dataSetId: selectedDataset.dataSetId
      });
      
      if (removeRLSResult.data?.statusCode === 200 || removeRLSResult.data?.statusCode === 201) {
        addLog(`✓ RLS configuration removed from main dataset: ${selectedDataset.dataSetId}`);
        set_step4_updatingMainDataSet(StepStatus.SUCCESS);
      } else {
        addLog(`✗ Failed to remove RLS from main dataset: ${removeRLSResult.data?.message}`, 'ERROR');
        set_step4_updatingMainDataSet(StepStatus.ERROR);
      }

      // 6. Update dataset record to mark RLS as disabled
      set_step5_refreshingRlsTool(StepStatus.LOADING);
      addLog(`[STEP 6/6] Updating dataset record in database...`);
      await client.models.DataSet.update({
        dataSetArn: selectedDataset.dataSetArn,
        rlsEnabled: 'DISABLED',
        rlsToolManaged: false
      });
      addLog(`✓ Dataset record updated: ${selectedDataset.dataSetArn}`);
      set_step5_refreshingRlsTool(StepStatus.SUCCESS);

      // 7. Refresh data
      addLog('Refreshing data...');
      await fetchPermissions();
      if (selectedDataset?.region) {
        await fetchDatasets(selectedDataset.region);
      }
      
      setRemoveAllModalVisible(false);
      setRemoveAllConfirmText('');
      addLog('');
      addLog('=== All permissions removed successfully! ===');
      alert('All permissions have been removed successfully!');
      
    } catch (error: any) {
      console.error('Error removing all permissions:', error);
      addLog(`✗ FATAL ERROR: ${error?.message || error}`, 'ERROR');
      alert('Error removing all permissions: ' + (error?.message || error));
    } finally {
      setRemovingAllPermissions(false);
    }
  };

  /**
   * Define the function that will be used to change status of the Status and Logs container
   */
  const changeStatusIndicator = () => {
    if(errorsCount > 0 && warningsCount > 0){
      setStatusIndicator({
        status:"error", 
        message:errorsCount+ " errors and " + warningsCount + " warnings found. Check Logs for more details."})
      }else if(errorsCount > 0 && warningsCount == 0){
        setStatusIndicator({
          status:"error",
          message:errorsCount+ " errors found. Check Logs for more details."})
      }else if(errorsCount == 0 && warningsCount > 0){
        setStatusIndicator({
          status:"warning",
          message:warningsCount+ " warnings found. Check Logs for more details."})
      }else{
        setStatusIndicator({status:"success", message:"Ok"})
      }
  }

  const changePermissionStatusIndicator = () => {
    const rls = selectedDataset?.rlsEnabled == "DISABLED" ? false : true
    const tool = selectedDataset?.rlsToolManaged || false
    const hasPermissions = permissionsList.length > 0 ? true : false

    switch (true) {
      case !rls && tool: // false, true, *
        setPermissionStatusIndicator ({
              status: "error",
              message: "RLS is disabled but RLS Tool Managed is true. Please refresh Region data from Global Settings page."
          });
        break
          
      case rls && tool && !hasPermissions: // true, true, false
        setPermissionStatusIndicator ({
              status: "error",
              message: "RLS is enabled and managed by RLS Tool, but no permissions are defined. Please add permissions or refresh the data."
          });
        break
      case ((rls && !tool) || (!rls && !tool)) && hasPermissions: // true, false, true OR false, false, true
        // Don't show warning for non-API manageable datasets (they have their own warning)
        if (selectedDataset?.apiManageable !== false) {
          setPermissionStatusIndicator ({
                status: "warning",
                message: "Permissions are defined but RLS is not enabled or not managed by the tool. Click 'Publish RLS in QuickSight' to apply them, or refresh the region data from Global Settings."
            });
        } else {
          setPermissionStatusIndicator({status: "success", message: "Ok"})
        }
        break  
      case ((! rls && ! tool && ! hasPermissions) || (rls && ! tool && ! hasPermissions)):
        setPermissionStatusIndicator({status: "success", message: "Ok"})
        break
      case( rls && tool && hasPermissions ):
        const dataSetLastUpdate = new Date(selectedDataset?.lastUpdatedTime ? selectedDataset.lastUpdatedTime : Date.now());
        if(permissionLastUpdate < dataSetLastUpdate){
          setPermissionStatusIndicator({status: "success", message: "Ok"})
        }else{
          setPermissionStatusIndicator({status: "warning", message: "Some Permissions have not be pushed to QuickSight yet."})
        }
        break
    }
  }
  
  /**
   * USE EFFECT
   */

  useEffect(() => {
    const checkPermissionStatusIndicator = async () => {
      // Don't update status indicator while permissions are loading
      if (permissionTableLoading) {
        return;
      }
      
      setPermissionStatusIndicator ({
        status: "success",
        message: "Ok."
    });
      changePermissionStatusIndicator()
    }

    const getLastPermissionUpdate = async () => {
      // for all permissions in permissionList get the updatedAt and extract the max, I want the last updatedAt value.
      let maxUpdatedAt = new Date(0);
      for (const permission of permissionsList) {
        const updatedAt = new Date(permission.updatedAt);
        if (updatedAt > maxUpdatedAt) {
          maxUpdatedAt = updatedAt;
        }
      }

    setPermissionLastUpdate(maxUpdatedAt)
    }

    getLastPermissionUpdate()
    checkPermissionStatusIndicator()

  }, [permissionsList, permissionTableLoading]);

  useEffect(() => {
    changeStatusIndicator()
  }, [errorsCount, warningsCount]);

  useEffect(() => {
    if (selectedDataset && selectedDataset?.dataSetArn) {
      fetchPermissions();
    }
  }, [selectedDataset]);

  useEffect(() => {
    if (selectedDataset && selectedDataset?.dataSetArn && selectedRegionDetails?.s3BucketName) {
      fetchVersionHistory();
    }
  }, [selectedDataset, selectedRegionDetails]);
  
  useEffect(() => {
    const fetchDataSetUseEffect = async (region: string) => {
      await fetchDatasets(region);
    }

    if( regionsList && selectedRegion && selectedRegion.value){
      setselectedRegionDetails( regionsList.find(region => region.regionName === selectedRegion.value) )
      fetchDataSetUseEffect(selectedRegion.value)
      resetAll()
    }
  }, [selectedRegion, regionsList]);

  useEffect(() => {
    if(searchParams.get('dataSetId') && datasetsList){
      const selectedDatasetDetails = datasetsList.find(
        datasets => datasets.dataSetId === searchParams.get('dataSetId')
      );

      if(selectedDatasetDetails){
        const newSelectedDataset: SelectedDataset = {
          value: searchParams.get('dataSetId') || '',
          label: selectedDatasetDetails.name || '',
          dataSetArn: selectedDatasetDetails.dataSetArn,
          dataSetId: selectedDatasetDetails.dataSetId,
          dataSetName: selectedDatasetDetails.name,
          region: selectedDatasetDetails.dataSetRegion,
          fieldTypes: selectedDatasetDetails.fieldTypes,
          rlsToolManaged: selectedDatasetDetails.rlsToolManaged,
          rlsDataSetId: selectedDatasetDetails.rlsDataSetId || "",
          rlsEnabled: selectedDatasetDetails.rlsEnabled,
          rlsS3Key: selectedDatasetDetails.glueS3Id,
          rlsS3BucketName: selectedRegion?.value ? regionsList?.find(r => r.regionName === selectedRegion.value)?.s3BucketName : undefined,
          lastUpdatedTime: selectedDatasetDetails.updatedAt
        };
        setSelectedDataset(newSelectedDataset);
      }
    }
  }, [datasetsList])

  useEffect(() => {
    if (selectedDataset && selectedDataset?.dataSetArn) {
      refreshCSVOutput(selectedDataset.dataSetArn);
    }

    // Disable publish button if no permissions OR if dataset is not API manageable
    const hasPermissions = permissionsList.length > 0;
    const isApiManageable = selectedDataset?.apiManageable !== false;
    
    if(hasPermissions && isApiManageable){
      setPublishQSRLSDisabled(false)
    }else{
      setPublishQSRLSDisabled(true)
    }

  }, [permissionsList]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchRegions();
      await fetchUsers();
      await fetchGroups(); 
      setLoading(false);
    }

    fetchData();
    
    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent>
          <p>Only DataSets manageable with APIs (and so by this tool) are present in the DataSet selection.</p>
          <p>DataSets created by this tool are not shown here. These are the DataSets used to manage the permissions with RLS.</p>
        </TextContent>
        <Header variant="h3">RLS Enabled:</Header>
        <TextContent>
          <ul>
            <li>
              <Badge color="green">ENABLED</Badge> The DataSet has RLS activated and managed by this tool.
            </li>
            <li>
            <Badge color="severity-medium">ENABLED</Badge> The DataSet has RLS activated and managed <strong>outside</strong> this tool (manually). If you start managing permission with this tool, this will override the existing RLS DataSet. If you see permissions in the Permissions Table and it's still orange, this means that the permissions have been created, but not pushed to QuickSight yet.
            </li>
            <li>
            <Badge color="severity-neutral">DISABLED</Badge> The RLS is disabled for this dataset.
            </li>
          </ul>
        </TextContent>
        <Header variant="h3">Permission Table Badges:</Header>
        <TextContent>
          <h4>User/Group Type:</h4>
          <ul>
            <li><Badge color="blue">User</Badge> - QuickSight user account</li>
            <li><Badge color="green">Group</Badge> - QuickSight group</li>
          </ul>
          
          <h4>Field/Value Wildcards:</h4>
          <ul>
            <li><Badge color="severity-neutral">* (All Fields)</Badge> - Permission applies to all fields in the dataset</li>
            <li><Badge color="severity-neutral">* (All Values)</Badge> - User/group can see all values for that field</li>
          </ul>
          
          <h4>Permission Status:</h4>
          <ul>
            <li><Badge color="green">Published</Badge> - Permission is saved in database AND applied to QuickSight</li>
            <li><Badge color="blue">Pending</Badge> - Permission is saved in database but NOT yet published to QuickSight. Click "Publish RLS in QuickSight" to apply it.</li>
            <li><Badge color="severity-medium">Manual</Badge> - Permission is saved for a non-API manageable dataset. Download the CSV and manually apply RLS in QuickSight.</li>
            <li><Badge color="red">Failed</Badge> - Last publish attempt failed. Check logs and try publishing again.</li>
          </ul>
        </TextContent>
        <Header variant="h3">RLS Dataset Visibility Badges:</Header>
        <TextContent>
          <ul>
            <li><Badge color="green">Synced</Badge> - Stored in database and applied to QuickSight</li>
            <li><Badge color="severity-low">QuickSight only</Badge> - Exists in QuickSight but not in our database (will be synced on save)</li>
            <li><Badge color="blue">New</Badge> - Added but not yet saved (click "Save & Apply" to persist)</li>
          </ul>
        </TextContent>
        
        <Header variant="h3">Row Level Security Rules:</Header>
        <TextContent>
          <ul>
            <li><strong>Anyone whom you shared your dashboard with can see all the data in it, unless the dataset is restricted by dataset rules.</strong></li>
            <li>Each user or group specified can see only the rows that match the field values in the dataset rules.</li>
            <li>If you add a rule for a user or group and leave all other columns with no value <i>(NULL)</i>, you grant them access to all the data.</li>
            <li>If you don't add a rule for a user or group, that user or group can't see any of the data.</li>
            <li>The full set of rule records that are applied per user must not exceed 999. This limitation applies to the total number of rules that are directly assigned to a username, plus any rules that are assigned to the user through group names.</li>
          </ul>
        </TextContent>
      </SpaceBetween>
    );
    setIsHelpPanelOpen(false); 

    // Cleanup when component unmounts
    return () => {
      setHelpPanelContent(null);
      setIsHelpPanelOpen(false);
    };
  }, [setHelpPanelContent]);

  useEffect(() => {

    const region = searchParams.get('region');  

    if(region){
      const paramRegion = { 
        value: region, 
        label: REGION_OPTIONS.find(option => option.value === region)?.label || '', 
        description: REGION_OPTIONS.find(option => option.value === region)?.description || ''
      }

      setSelectedRegion(paramRegion)
      setFormDataSetSelectDisabled(false)
    }
  }, [searchParams]);

  // Update visibility user/group options when type changes
  useEffect(() => {
    if (!selectedVisibilityType) {
      setVisibilityUserGroupOptions([]);
      return;
    }
    
    const sourceList = selectedVisibilityType.value === 'user' ? users : groups;
    const options = sourceList.map(item => ({
      label: item.name,
      value: item.userGroupArn
    }));
    
    setVisibilityUserGroupOptions(options);
    setSelectedVisibilityUserGroup(null);
  }, [selectedVisibilityType, users, groups]);

  return (
    <>
      <BreadcrumbGroup
        items={[
          { text: "QS Managed RLS Tool", href: "/" },
          { text: "Permissions", href: "/manage-permissions" },
          { text: "Manage Permissions", href: "/manage-permissions" },
        ]}
      />
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
            description="Here you can manage the Permissions for Row Level Security of you DataSets"
          >
          Manage Permission
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container
            header={
              <Header
                variant="h2"
                description="Select the DataSet you want to manage the Permissions for."
              >
                DataSet Selection
              </Header>
            }
          >
            <SpaceBetween direction="vertical" size="l">
              <FormField
                label="QuickSight DataSet Region:"
                warningText={noDataSetFoundWarning}
                info={
                  <Popover
                    size="large"
                    header="Managed Regions"
                    content={<TextContent>Only AWS Regions enabled in this tool are visible here. If you need to add/remove regions, go to the <Link href="/">Homepage</Link>.</TextContent>}
                  >
                    <Link variant="info">Info</Link>
                  </Popover>}
              >
                <Select 
                  controlId="quicksightDataSetRegion"
                  selectedOption={selectedRegion}
                  options={regionsList 
                    ? regionsList.map(region => ({
                        value: region.regionName,
                        label: REGION_OPTIONS.find(option => option.value === region.regionName)?.label || '',
                        description: REGION_OPTIONS.find(option => option.value === region.regionName)?.description || '',
                      }))
                    : []
                  }
                  onChange={({detail}) => {
                    const newOptions = detail.selectedOption as { value: string, label: string, description: string}
                    setSelectedRegion(newOptions);
                  }}
                  placeholder="Choose a Region"
                  disabled={loading}
                  empty="No Region found."
                  virtualScroll
                  filteringType="auto"
                />
              </FormField>
              {selectedRegion && 
                <ExpandableSection
                  headerText="Region Details"
                >
                <SpaceBetween size="l">
                  <KeyValuePairs 
                    columns={3}
                    items={[
                      {
                        label: "Region ID",
                        value: selectedRegionDetails?.regionName || ""
                      },
                      {
                        label: "SPICE",
                        value: (
                          <ProgressBar
                            value= { selectedRegionDetails?.availableCapacityInGB != 0 ? (selectedRegionDetails?.usedCapacityInGB || 0) / ( selectedRegionDetails?.availableCapacityInGB || 1 ) * 100 : 0 }
                            description= "Capacity Used"
                            label={(selectedRegionDetails?.usedCapacityInGB || 0) + " GB / " + ( selectedRegionDetails?.availableCapacityInGB || 1 )  + " GB" }
                          />)
                      },
                      {
                        label: "DataSets",
                        value: (<SpaceBetween size="xxxs">
                          <TextContent><StatusIndicator type="success">Manageable DataSets</StatusIndicator>: {selectedRegionDetails?.datasetsCount || 0}</TextContent>
                          <TextContent><StatusIndicator type="error">Un-Manageable DataSets</StatusIndicator>: {selectedRegionDetails?.notManageableDatasetsCount || 0}</TextContent>
                          <TextContent>Created with RLS Tool: {selectedRegionDetails?.toolCreatedCount || 0}</TextContent>
                        </SpaceBetween>)
                      },
                      {
                        label: "S3 Bucket",
                        value:   (
                          <CopyToClipboard
                            copyButtonAriaLabel="Copy S3 Bucket"
                            copyErrorText="Bucket failed to copy"
                            copySuccessText="Bucket copied"
                            textToCopy={selectedRegionDetails?.s3BucketName || "-"}
                            variant="inline"
                          />
                        )
                      },
                      {
                        label: "Glue Database",
                        value:   (
                          <CopyToClipboard
                            copyButtonAriaLabel="Copy Glue Database"
                            copyErrorText="Database failed to copy"
                            copySuccessText="Database copied"
                            textToCopy={selectedRegionDetails?.glueDatabaseName || "-"}
                            variant="inline"
                          />
                        )
                      },
                      {
                        label: "QuickSight DataSource",
                        value:   (
                            <CopyToClipboard
                            copyButtonAriaLabel="Copy DataSource"
                            copyErrorText="DataSource failed to copy"
                            copySuccessText="DataSource copied"
                            textToCopy={selectedRegionDetails?.qsDataSource || "-"}
                            variant="inline"
                          />
                        )
                      }
                    ]}
                  />  
                </SpaceBetween>
                </ExpandableSection>
              }
              <FormField 
                info={
                  <Popover
                    size="large"
                    header="DataSet List:"
                    content={<TextContent>Only DataSets that are manageable with this tool are shown.<br></br>DataSets which are RLS created by this tool are not shown too.</TextContent>}
                  >
                    <Link variant="info">Info</Link>
                  </Popover>}
                label="DataSet:"
              >
                <Select 
                  controlId="quicksightDataSet"
                  disabled={formDataSetSelectDisabled}
                  selectedOption={selectedDataset as any}
                  options={datasetOptions}
                  onChange={({ detail }) => {

                    setLogs("")
                    setStatusIndicator({status:"success", message: "Ok"})
                    const selectedDatasetDetails = datasetsList.find(
                      datasets => datasets.dataSetId === detail.selectedOption.value
                    );
                    // Create a properly typed object
                    const newSelectedDataset: SelectedDataset = {
                      value: detail.selectedOption.value || '',
                      label: detail.selectedOption.label || '',
                      description: detail.selectedOption.description,
                      dataSetArn: selectedDatasetDetails.dataSetArn,
                      dataSetId: selectedDatasetDetails.dataSetId,
                      dataSetName: selectedDatasetDetails.name,
                      region: selectedDatasetDetails.dataSetRegion,
                      fieldTypes: selectedDatasetDetails.fieldTypes,
                      rlsToolManaged: selectedDatasetDetails.rlsToolManaged,
                      rlsDataSetId: selectedDatasetDetails.rlsDataSetId || "",
                      rlsEnabled: selectedDatasetDetails.rlsEnabled,
                      rlsS3Key: selectedDatasetDetails.glueS3Id,
                      rlsS3BucketName: selectedRegion?.value ? regionsList?.find(r => r.regionName === selectedRegion.value)?.s3BucketName : undefined,
                      lastUpdatedTime: selectedDatasetDetails.updatedAt,
                      apiManageable: selectedDatasetDetails.apiManageable
                    };
                    
                    setSelectedDataset(newSelectedDataset);
                  }}
                  placeholder="Choose a DataSet"
                  empty="No DataSets found."
                  virtualScroll
                  filteringType="auto"
                  triggerVariant="option"
                />
              </FormField>
            
            {selectedDataset && (
              <>
                {(() => {
                  const datasetDetails = getSelectedDatasetDetails();
                  if (datasetDetails) {
                    return (
                      <ExpandableSection
                        headerText="DataSet Details"
                      >
                      <SpaceBetween size="l">
                      <Header
                        variant="h2"
                      >
                        DataSet Details
                      </Header>
                      
                      <KeyValuePairs 
                        columns={3}
                        items={[
                          // Name
                          {
                            label: "Name",
                            value: (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy Name"
                                copyErrorText="Name failed to copy"
                                copySuccessText="Name copied"
                                textToCopy={datasetDetails.name}
                                variant="inline"
                              />
                            )
                          },
                          // ID
                          {
                            label: "ID",
                            value: (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy ID"
                                copyErrorText="ID failed to copy"
                                copySuccessText="ID copied"
                                textToCopy={datasetDetails.dataSetId}
                                variant="inline"
                              />
                            )
                          },
                          // ARN
                          {
                            label: "ARN",
                            value: (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy ARN"
                                copyErrorText="ARN failed to copy"
                                copySuccessText="ARN copied"
                                textToCopy={datasetDetails.dataSetArn}
                                variant="inline"
                              />
                            )
                          },
                          // Import Mode (with SPICE capacity if applicable)
                          {
                            label: datasetDetails.importMode === "SPICE" && datasetDetails.spiceCapacityInBytes 
                              ? "Import Mode (Consumed SPICE Capacity)" 
                              : "Import Mode",
                            value: (
                              <SpaceBetween direction="horizontal" size="xs">
                                <Badge color={datasetDetails.importMode === "SPICE" ? "severity-medium" : "blue"}>
                                  {datasetDetails.importMode}
                                </Badge>
                                {datasetDetails.importMode === "SPICE" && datasetDetails.spiceCapacityInBytes && (
                                  <span>{formatBytes(datasetDetails.spiceCapacityInBytes)}</span>
                                )}
                              </SpaceBetween>
                            ),
                          },
                          // Usage
                          {
                            label: "Usage",
                            value: (
                              <Badge color={datasetDetails.isRls ? "blue" : "green"}>
                                {datasetDetails.isRls ? "Rules Dataset" : "Data"}
                              </Badge>
                            ),
                          },
                          // Data Prep Mode
                          {
                            label: "Data Prep Mode",
                            value: (
                              <Badge color={datasetDetails.newDataPrep ? "green" : "severity-medium"}>
                                {datasetDetails.newDataPrep ? "New" : "Old"}
                              </Badge>
                            ),
                          },
                          // Manageable
                          {
                            label: "Manageable",
                            value: (() => {
                              if (datasetDetails.isRls) {
                                return (
                                  <Badge color="blue">
                                    No (is RLS)
                                  </Badge>
                                );
                              }
                              if (datasetDetails.toolCreated) {
                                return (
                                  <Badge color="severity-neutral">
                                    N/A
                                  </Badge>
                                );
                              }
                              return (
                                <Badge color={datasetDetails.apiManageable ? "green" : "red"}>
                                  {datasetDetails.apiManageable ? "Yes" : "No"}
                                </Badge>
                              );
                            })(),
                          },
                          // Created Time
                          {
                            label: "Created Time",
                            value: datasetDetails.createdTime,
                          },
                          // Last Updated
                          {
                            label: "Last Updated",
                            value: datasetDetails.lastUpdatedTime,
                          },
                          // RLS Enabled (only for non-RLS datasets)
                          ...(!datasetDetails.isRls ? [{
                            label: "RLS Enabled",
                            value: (
                              <Badge color={datasetDetails.rlsEnabled === "ENABLED" ? (datasetDetails.rlsToolManaged === true 
                                ? "green" 
                                : "severity-medium") : "severity-neutral"}>
                                {datasetDetails.rlsEnabled}
                              </Badge>
                            ),
                          }] : []),
                          // RLS Dataset Name (only if RLS is enabled)
                          ...(datasetDetails.rlsEnabled === "ENABLED" && !datasetDetails.isRls && datasetDetails.rlsDataSetId ? [
                            {
                              label: "RLS Dataset Name",
                              value: (() => {
                                // RLS dataset name format: "Managed-RLS for DataSetId: <dataSetId>"
                                const rlsName = `Managed-RLS for DataSetId: ${datasetDetails.dataSetId}`;
                                
                                return (
                                  <CopyToClipboard
                                    copyButtonAriaLabel="Copy RLS Dataset Name"
                                    copyErrorText="Name failed to copy"
                                    copySuccessText="Name copied"
                                    textToCopy={rlsName}
                                    variant="inline"
                                  />
                                );
                              })(),
                            },
                          ] : []),
                          // RLS Dataset ARN (only if RLS is enabled)
                          ...(datasetDetails.rlsEnabled === "ENABLED" && !datasetDetails.isRls ? [
                            {
                              label: "RLS Dataset ARN",
                              value: (
                                <CopyToClipboard
                                  copyButtonAriaLabel="Copy ARN"
                                  copyErrorText="ARN failed to copy"
                                  copySuccessText="ARN copied"
                                  textToCopy={datasetDetails.rlsDataSetId}
                                  variant="inline"
                                />
                              )
                            },
                          ] : []),

                        ]}
                      />
                      
                      </SpaceBetween>
                      </ExpandableSection>
                    );
                  }
                  return null;
                })()}
                </>
            )}
            </SpaceBetween>
          </Container>
          { selectedDataset && (
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  !getSelectedDatasetDetails()?.isRls ? (
                  <SpaceBetween
                  direction="horizontal"
                  size="xs"
                  >
                    <Button
                      onClick={() => {
                        fetchPermissions();
                      }}
                      iconName="refresh"
                    >
                      Refresh
                    </Button>
                    <Button
                      onClick={() => setModalVisible(true)}  
                      variant="primary"
                      iconName="add-plus"
                    >
                      Add Permission
                    </Button>
                    <ButtonDropdown
                      items={[
                        {
                          text: "Import from CSV",
                          id: "import-csv",
                          iconName: "upload"
                        },
                        {
                          text: "Copy permissions from",
                          id: "copy-from",
                          iconName: "copy"
                        },
                        {
                          text: "Publish RLS in QuickSight",
                          id: "publish-rls",
                          iconName: "thumbs-up",
                          disabled: publishQSRLSDisabled
                        },
                        {
                          text: "Manage RLS Dataset Visibility",
                          id: "manage-visibility",
                          iconName: "share",
                          disabled: !selectedDataset?.rlsToolManaged || !selectedDataset?.rlsDataSetId
                        },
                        {
                          text: "Remove All Permissions",
                          id: "remove-all",
                          iconName: "remove",
                          disabled: permissionsList.filter(p => p.dataSetArn === selectedDataset?.dataSetArn).length === 0
                        }
                      ]}
                      onItemClick={({ detail }) => {
                        if (detail.id === "import-csv") {
                          document.getElementById('csv-import-input')?.click();
                        } else if (detail.id === "copy-from") {
                          setCopyPermissionsModalVisible(true);
                        } else if (detail.id === "publish-rls") {
                          publishQSRLSPermissionsClickHandler();
                        } else if (detail.id === "manage-visibility") {
                          openRLSVisibilityModal();
                        } else if (detail.id === "remove-all") {
                          setRemoveAllModalVisible(true);
                        }
                      }}
                      loading={publishQSRLSLoading}
                    >
                      Actions
                    </ButtonDropdown>
                    <input
                      id="csv-import-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleCSVFileUpload}
                    />
                  </SpaceBetween>
                  ) : undefined
                }
              >
                Permissions
              </Header>
            }
          >
            <SpaceBetween size="l">
              {(() => {
                const datasetDetails = getSelectedDatasetDetails();
                if (datasetDetails?.isRls) {
                  return (
                    <Box variant="div" padding="l">
                      <StatusIndicator type="warning">
                        This is a Row Level Security DataSet. You cannot edit the permissions of this DataSet.
                      </StatusIndicator>
                    </Box>
                  );
                }
                return (
                  <>
                    {permissionStatusIndicator.status === 'error' && (
                      <Alert type="error" header="Configuration Error">
                        {permissionStatusIndicator.message}
                      </Alert>
                    )}
                    
                    {permissionStatusIndicator.status === 'warning' && (
                      <Alert type="warning" header="Action Required">
                        {permissionStatusIndicator.message}
                      </Alert>
                    )}
                    
                    {/* Warning for non-API manageable datasets */}
                    {selectedDataset && selectedDataset.apiManageable === false && !apiLimitationsAlertDismissed && (
                      <Alert 
                        type="warning" 
                        dismissible 
                        onDismiss={() => setApiLimitationsAlertDismissed(true)}
                        header="API Limitations - Manual RLS Required"
                      >
                        <SpaceBetween size="s">
                          <div>
                            This dataset was created via <strong>direct file upload</strong> (CSV/Excel) and cannot be updated via QuickSight APIs due to AWS limitations.
                          </div>
                          <div>
                            <strong>What you can do:</strong>
                            <ul>
                              <li>✅ Define and manage permissions using this tool</li>
                              <li>✅ Download the RLS CSV file</li>
                              <li>❌ Automatic publish to QuickSight (disabled)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>To apply RLS:</strong> You must manually upload the CSV file to QuickSight through the UI.
                          </div>
                        </SpaceBetween>
                      </Alert>
                    )}
                    
                    <TextContent><p>Anyone whom you shared your dashboard with can see all the data in it, unless the dataset is restricted by dataset rules.</p><p>"<strong>*</strong>" is the wildcard.</p></TextContent>
                    <Table
                trackBy="permissionId"
                loadingText="Loading Permissions"
                loading={permissionTableLoading}
                sortingDisabled
                stripedRows
                wrapLines
                variant="embedded"
                expandableRows={{
                  getItemChildren: (item: PermissionItem): readonly PermissionItem[] => {
                    return item.children || [];
                  },
                  isItemExpandable: (item: PermissionItem) => Boolean(item.children?.length),
                  expandedItems: expandedItems,
                  onExpandableItemToggle: ({ detail }) => {
                    if (detail.expanded) {
                      setExpandedItems([detail.item]);
                    } else {
                      setExpandedItems([]);
                    }
                  }
                }}
                items={Object.values(permissionsList.reduce<Record<string, PermissionItem[]>>((acc, permission) => {
                  const name = permission.userGroupArn ? 
                    permission.userGroupArn.split(":")[5].split("/").slice(2).join("/") : '';
                  
                  if (!acc[name]) {
                    acc[name] = [];
                  }
                  
                  acc[name].push({
                    userGroup: permission.userGroupArn ? 
                      permission.userGroupArn.split(":")[5].split("/")[0].toUpperCase() : '',
                    name: name,
                    arn: permission.userGroupArn,
                    field: permission.field,
                    values: permission.rlsValues,
                    permissionId: permission.id,
                    createdAt: permission.createdAt,
                    status: permission.status,
                    lastPublishedAt: permission.lastPublishedAt,
                    children: []
                  });
                  
                  return acc;
                }, {})).map(items => {
                  // If only one item with this name, return it directly
                  if (items.length === 1) {
                    return items[0];
                  }
                  
                  // If multiple items, create a parent item with children
                  return {
                    userGroup: items[0].userGroup,
                    name: items[0].name,
                    arn: '',
                    field: '',
                    values: '',
                    permissionId: 'pid-' + items[0].name,
                    children: items.map(item => ({
                      userGroup: '-',
                      name: "-",
                      arn: item.arn,
                      field: item.field,
                      values: item.values,
                      permissionId: item.permissionId,
                      createdAt: item.createdAt,
                      children: []
                    }))
                  };
                }) as PermissionItem[]}
                
                
                columnDisplay={
                  [

                    { id: "name", visible: true },
                    { id: "userGroup", visible: true },
                    { id: "arn", visible: false },
                    { id: "field", visible: true },
                    { id: "values", visible: true },
                    { id: "status", visible: true },
                    { id: "permissionId", visible: false },
                    { id: "delete", visible: true},
                  ]
                }
                columnDefinitions={[
                  { 
                    id: "permissionId", 
                    header: "Permission ID", 
                    cell: (item: any) => item.permissionId,
                  },
                  { 
                    id: "userGroup", 
                    header: "Type", 
                    cell: (item: any) => {
                      if (item.userGroup === '-') return '-';
                      return (
                        <Badge color={item.userGroup === "USER" ? "blue" : "green"}>
                          {item.userGroup === "USER" ? "User" : "Group"}
                        </Badge>
                      );
                    }
                  },
                  { 
                    id: "name", 
                    header: "Name", 
                    cell: (item: any) => item.name,
                  },
                  { 
                    id: "arn", 
                    header: "ARN", 
                    cell: (item: any) => item.arn,
                  },
                  { 
                    id: "field", 
                    header: "Field", 
                    cell: (item: any) => item.field === "*" ? (
                      <Badge color="severity-neutral">* (All fields)</Badge>
                    ) : item.field,
                  },
                  {
                    id: "values",
                    header: "Values",
                    cell: item => {
                      if (item.values === "*") {
                        return <Badge color="severity-neutral">* (All values)</Badge>;
                      }
                      return item.values;
                    },
                    
                    editConfig: {
                      ariaLabel: "Values",
                      editIconAriaLabel: "editable",
                      errorIconAriaLabel: "Values Error",
                      disabledReason: item => {
                        if (item.field === "*") {
                          return "You cannot in-line edit permit-all permissions.";
                        }
                        if (item.permissionId.startsWith("pid-")){
                          return "Please, edit single Permission Values."}

                        return undefined;
                      },
                      editingCell: (
                        item,
                        { currentValue, setValue }
                      ) => {
                        return (
                          <Input
                            autoFocus={true}
                            value={currentValue ?? item.values}
                            onChange={event =>
                            {
                              setValue(event.detail.value)
                              setRowRLSValueAftedEdit(event.detail.value)
                            }
                            }
                          
                          />
                        );
                      },
                    }
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: item => {
                      if (!item.createdAt || item.permissionId.startsWith("pid-")) {
                        return null;
                      }
                      
                      // Show status based on publish state
                      if (item.status === 'PUBLISHED') {
                        return <Badge color="green">Published</Badge>;
                      } else if (item.status === 'FAILED') {
                        return <Badge color="red">Failed</Badge>;
                      } else if (item.status === 'MANUAL') {
                        return <Badge color="severity-medium">Manual</Badge>;
                      } else {
                        // PENDING or no status (legacy)
                        return <Badge color="blue">Pending</Badge>;
                      }
                    }
                  },
                  {
                    id: "delete",
                    header: "Remove",
                    cell: item => {
                      if( ! item.permissionId.startsWith("pid-") ){
                      
                        return (
                        <Button
                          variant="inline-link"
                          ariaLabel={`Remove Permission ${item.permissionId}`}
                          onClick={() => {
                            permissionRowDelete(item.permissionId)
                          }}
                        >
                          <Icon name="remove" />
                        </Button>
                        )
                      }else{
                        return null
                      }
                    },
                    minWidth: 170
                  }
                ]}
                submitEdit={(event) => {
                  try{
                    permissionRowEdit({
                      id: event.permissionId,
                      dataSetArn: selectedDataset.dataSetArn,
                      arn: event.arn,
                      field: event.field,
                      field_values: rowRLSValueAftedEdit
                    })
                  }catch(err){
                    console.error(err)
                  }
                }}
                empty={
                  <Box
                    textAlign="center"
                    display="block"
                  >
                    <b>No Permissions</b> in this DataSet.
                  </Box>
                }
              />
                  </>
                );
              })()}
            </SpaceBetween>

          </Container>
          )}
          {!getSelectedDatasetDetails()?.isRls && selectedDataset && selectedDataset.apiManageable !== false && (
          <ExpandableSection 
              headerText="Version History"
              variant="container">  
            <SpaceBetween size="l">
              <Alert type="info">
                View and restore previous versions of published permissions. Each publish creates a new version in S3.
              </Alert>
              <Table
                loading={versionHistoryLoading}
                loadingText="Loading version history..."
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No versions found</b>
                    <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                      Versions will appear here after you publish permissions.
                    </Box>
                  </Box>
                }
                items={versionHistory}
                columnDefinitions={[
                  {
                    id: "version",
                    header: "Version",
                    cell: (item) => item.isLatest ? (
                      <Badge color="green">Latest</Badge>
                    ) : (
                      <Badge color="grey">v{item.versionId?.substring(0, 8)}</Badge>
                    )
                  },
                  {
                    id: "lastModified",
                    header: "Published At",
                    cell: (item) => item.lastModified ? new Date(item.lastModified).toLocaleString() : '-'
                  },
                  {
                    id: "size",
                    header: "Size",
                    cell: (item) => item.size ? `${(item.size / 1024).toFixed(2)} KB` : '-'
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    cell: (item) => (
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          variant="inline-link"
                          onClick={() => {
                            setSelectedVersion(item);
                            handlePreviewVersion(item.versionId);
                          }}
                        >
                          View
                        </Button>
                        {!item.isLatest && (
                          <Button
                            variant="inline-link"
                            onClick={() => {
                              setSelectedVersion(item);
                              setRollbackModalVisible(true);
                            }}
                          >
                            Rollback
                          </Button>
                        )}
                      </SpaceBetween>
                    )
                  }
                ]}
              />
              <Button
                iconName="refresh"
                onClick={fetchVersionHistory}
                loading={versionHistoryLoading}
              >
                Refresh
              </Button>
            </SpaceBetween>
          </ExpandableSection>
          )}
          {
            seeCSVOutput && !getSelectedDatasetDetails()?.isRls && selectedDataset && (
              <ExpandableSection
                variant="container"
                headerText={<>Export CSV {codeViewLoading && <Spinner />}</>}
                headerActions={
                  <Button
                    onClick={
                      () => {
                        // download a csv file called "MyFile" with csvOutput as content
                        const element = document.createElement("a");
                        const file = new Blob([csvOutput], { type: 'text/plain' });
                        element.href = URL.createObjectURL(file);
                        element.download = "RLS-for-dataset-" + selectedDataset?.label + ".csv";
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }
                    }
                  >
                    <Icon name="download"/>
                    <> Export CSV</>
                  </Button>

                }>
                
                  <CodeView
                    lineNumbers
                    content={csvOutput}
                    
                  />
              </ExpandableSection>
            )
          }
          {!getSelectedDatasetDetails()?.isRls && (
          <ExpandableSection 
              headerText={
                <>
                  {"Status and Logs: "}<StatusIndicator type={statusIndicator.status as StatusIndicatorProps.Type}>{statusIndicator.message}</StatusIndicator>
                </>
              } 
              variant="container">  
            <SpaceBetween size="l">
              <Steps 
                steps={getStepsForAction().map(step => ({
                  ...step,
                  statusIconAriaLabel: step.status
                }))}
              />
              <CodeView 
                content={ logs }
                lineNumbers
                wrapLines
              />
            </SpaceBetween>
          </ExpandableSection>
          )}
        </SpaceBetween>
        <Modal

          onDismiss={() => {
            setModalVisible(false)
            resetModal()
          }}
          visible={modalVisible}
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={
                  () => {
                    setModalVisible(false)
                    resetModal()
                  }
                }>Cancel</Button>
                <Button variant="link" onClick={
                  () => resetModal()
                }>Clear</Button>
                <Button 
                  variant="primary"
                  disabled={newPermissionButtonDisabled}
                  onClick={
                    async () => {
                      
                      setLogs("")

                      if( (! seesAll && selectedField == null) || selectedUserGroupArn == null || selectedDataset == null ){
                        addLog("Please try again filling all the fields", "ERROR", 500, "PermissionCreationError")
                        setModalErrorText({
                          type:"error", 
                          message: 'Please try again filling all the fields',
                          header: 'Permission Creation Error'});
                        return
                      } else if (! seesAll && filterValues != "*" && ! validateFilterValues(filterValues) ){
                        addLog("Invalid format. Use only letters, numbers, and '-_/\\" + " separated by commas (e.g., 'value1, value2')", "WARNING")
                        setModalErrorText({
                          type:"warning", 
                          message: 'Invalid format. Use only letters, numbers, and "-_/\\" separated by commas (e.g., "value1, value2")', // [a-zA-Z0-9\-_\/\\]
                          header: 'Field Validation issue'});
                      } else {

                        addLog("Start Updating Permission")
                        let field_values = ""
                        let field_selected = ""

                        // Check if there is a seesAll permission
                        if( seesAll ){
                          addLog("Added a Sees All Permission. Deleting previous permissions related to entity: " + selectedUserGroupArn.value)
                          field_values = "*"
                          field_selected = "*"
                          try{
                            await deleteAllPermissionsForUserGroup(selectedUserGroupArn.value, selectedDataset.dataSetArn)
                            addLog("Deleted all previous permissions for entity: " + selectedUserGroupArn.value + " in dataset: " + selectedDataset.label)
                          }catch(err){
                            addLog("Error trying to delete previously created permissions.", "ERROR", 500, "PermissionDeletionError")
                            setModalErrorText({
                              type:"error", 
                              message: 'Error trying to delete previously created permissions.',
                              header: 'Permission Deletion Error'});
                          }
                        }else if ( !seesAll && filterValues === "*" && selectedField != null){
                          // Check if there is a seesAll permission for the specific Field
                          field_values = "*"
                          field_selected = selectedField.value
                        }else if ( selectedField != null && filterValues != ""){
                          field_values = filterValues
                          field_selected = selectedField.value
                        }else{
                          setModalErrorText({
                            type:"error",
                            message: 'Please try again filling all the fields',
                            header: 'Permission Creation Error'});
                          return
                        }

                        setModalErrorText(null)
                        
                        if( existingPermissionEdit == null || existingPermissionEdit.length == 0 ){
                          // (dataSetArn: string, userGroupArn: string, field: string, rlsValues: string)
                          addLog("Creating new Permission for " + selectedUserGroupArn.value + " in dataset " + selectedDataset.label)
                          await permissionCreate(selectedDataset.dataSetArn, selectedUserGroupArn.value, field_selected, field_values )
                          addLog("Created new Permission for " + selectedUserGroupArn.value + " in dataset " + selectedDataset.label)
                        }else{
                          addLog("Updating Permission for " + selectedUserGroupArn.value + " in dataset " + selectedDataset.label)
                          await permissionRowEdit({
                            id: existingPermissionEdit.id,
                            field_values: field_values,
                            dataSetArn: existingPermissionEdit.dataSetArn,
                            aen: existingPermissionEdit.userGroupArn,
                            field: field_selected,
                          })
                          addLog("Updated Permission for " + selectedUserGroupArn.value + " in dataset " + selectedDataset.label)
                        }
                        
                        resetModal()
                        setModalVisible(false)
                      }
                    }
                  }
                >{ filterValuesWarningText === "" ? "Create Permission" : "Update Permission"}</Button>
              </SpaceBetween>
            </Box>
          }
          header="Add new Permission"
        >
          <SpaceBetween size="l">
            <FormField 
              description="Select if you want to create a Permission for a Specific Group or for a User."
              label="User/Group"
            >
              <Select
                placeholder="User/Group"
                selectedOption={selectedUserGroup}
                onChange={({ detail }) => {   
                  if(selectedUserGroup == null){
                    setSelectedUserGroup({
                      label: detail.selectedOption.label || "",
                      value: detail.selectedOption.value || ""
                    })              
                  }
                  if(selectedUserGroup != null && detail.selectedOption.value != selectedUserGroup.value){
                    resetAfterUserGroupTypeChoiche()
                    setSelectedUserGroup({
                      label: detail.selectedOption.label || "",
                      value: detail.selectedOption.value || ""
                    })
                  } 
                  setFormUserGroupListSelectDisabled(false)  
                }}
                options={[
                  {
                    label: "User",
                    value: "User",
                  },
                  {
                    label: "Group",
                    value: "Group",
                  }
                ]}
              />
            </FormField>
            <FormField label={selectedUserGroup ? (`Select a ${selectedUserGroup?.value}`) : "Select a User/Group"}
              warningText={selectedUserGroupWarningText}
              >
              <Select
                disabled={formUserGroupListSelectDisabled}
                selectedOption={selectedUserGroupArn}
                placeholder={selectedUserGroup ? (`Choose a ${selectedUserGroup?.value} from the list`) : "Choose a User/Group from the list"}
                filteringType="auto"
                onChange={({ detail }) => {
                  setSelectedUserGroupWarningText("")
                  setSeesAllWarningText("")
                  if(selectedUserGroupArn && detail.selectedOption.value != selectedUserGroupArn.value){
                    setSelectedField({label: "", value: ""})
                    setFilterValues("")
                    setFilterValuesWarningText("")
                    setFormFilterValueInputDisabled(true)
                    setSeesAll(false)
                  }

                  setSelectedUserGroupArn({
                    label: detail.selectedOption.label || "",
                    value: detail.selectedOption.value || ""
                  })

                  const existingSeesAllPermission = permissionsList.find(permission => 
                    permission.dataSetArn === selectedDataset?.dataSetArn &&
                    permission.userGroupArn === detail.selectedOption.value &&
                    permission.field === "*"
                  );

                  if(existingSeesAllPermission){
                    setFormSeesAllDisabled(true)
                    setFormFieldSelectDisabled(true)
                    setSelectedUserGroupWarningText(`This ${selectedUserGroup?.value || "User/Group"} already has a permission for the full DataSet. Please delete it if you want to add different kind of permissions!`)
                  } else {
                    setFormFieldSelectDisabled(false)
                    setFormSeesAllDisabled(false)
                  }


                  
                }}
                options={
                  (selectedUserGroup != null && selectedUserGroup.value === 'User' ? users : groups).map(item => (
                    {
                      label: item.name,
                      value: item.userGroupArn
                    }
                  ))
                }
              />
            </FormField>
            <FormField label="Sees All:"
              warningText={seesAllWarningText}
            >
              <Toggle
                disabled={formSeesAllDisabled}
                onChange={({ detail }) =>{

                  setSeesAllWarningText("")
                  const existingPermission = permissionsList.find(permission => 
                    permission.dataSetArn === selectedDataset?.dataSetArn &&
                    permission.userGroupArn === selectedUserGroupArn?.value
                  );

                  if( existingPermission ){
                    if ( selectedUserGroup != null )
                      setSeesAllWarningText(`There are specific field-permissions for this ${selectedUserGroup.value || "User/Group"}. By checking this toggle, all the specific field permissions will be removed and the ${selectedUserGroup.value || "User/Group"} will have access to the full DataSet`)
                  }

                  setSeesAll(detail.checked)
                  
                  if(detail.checked){
                    setFilterValuesWarningText("")
                    setFilterValues("")
                    setSelectedField(null)
                    setFormFieldSelectDisabled(true)
                    setNewPermissionButtonDisabled(false)
                    setFormFilterValueInputDisabled(true)
                  }else{
                    setSeesAllWarningText("")
                    setFormFieldSelectDisabled(false)
                    setNewPermissionButtonDisabled(true)
                  }

                }}
                checked={seesAll}
              >By checking this, the {selectedUserGroup ? selectedUserGroup.value : "User/Group"} will have access to the full DataSet:</Toggle>

            </FormField>
            <FormField label="Select a Field:">
              <Select
                disabled={formFieldSelectDisabled}
                selectedOption={selectedField}
                filteringType="auto"
                placeholder="Choose a Field from the list"
                onChange={({ detail }) => {
                  const newField = {
                    label: detail.selectedOption.label || "",
                    value: detail.selectedOption.value || ""
                  };

                  if(selectedField!= null && detail.selectedOption.value != selectedField.value){
                    setFilterValues("")
                    setFilterValuesWarningText("")
                  }

                  setSelectedField(newField);
                  setFormFilterValueInputDisabled(false);

                  // Check for existing permission with same dataset, userGroup, and field
                  const existingPermission = permissionsList.find(permission => 
                    permission.dataSetArn === selectedDataset?.dataSetArn &&
                    permission.userGroupArn === selectedUserGroupArn?.value &&
                    permission.field === newField.value
                  );

                  if (existingPermission) {
                    setFilterValuesWarningText("There's already a permission with these data. Your're now updating it.")
                    setFilterValues(existingPermission.rlsValues);
                    setExistingPermissionEdit(existingPermission)
                    setNewPermissionButtonDisabled(false)
                  } else {
                    // Reset filter values if no existing permission found
                    setFilterValues('');
                    setFilterValuesWarningText("")
                    setExistingPermissionEdit(null)
                  }

                }}
                options={
                  // Get fields from fieldTypes, show type, disable date fields
                  selectedDataset?.fieldTypes 
                    ? (() => {
                        const fieldTypesMap = JSON.parse(selectedDataset.fieldTypes);
                        return Object.keys(fieldTypesMap).map((fieldName: string) => {
                          const fieldType = fieldTypesMap[fieldName];
                          const isDate = isDateType(fieldType);
                          return {
                            label: `${fieldName} (${fieldType})`,
                            value: fieldName,
                            disabled: isDate,
                            tags: isDate ? ['Date field - Not supported'] : []
                          };
                        });
                      })()
                    : []
                }
                />
            </FormField>
            
            <Alert type="info">
              <strong>Note:</strong> Date fields are not supported for RLS rules due to QuickSight limitations and are disabled in the dropdown above. 
              Numeric fields are not officially supported but may work in some cases. Only text/string fields are fully supported.
            </Alert>

            <FormField 
              label="Filter Values:"
              description={`Comma-separated list. Use * if you want the ${selectedUserGroup ? selectedUserGroup.value : "User/Group"} to see all the values for the selected Field.`}
              warningText={modalErrorText ? undefined : filterValuesWarningText}
              info={
                <Popover 
                  header="Filter Values:"
                  content={`These are the values your ${selectedUserGroup ? selectedUserGroup.value : "User/Group"} will be able to see. E.g. Field="country", Filter Values="Italy, 
                  France" means that the ${selectedUserGroup ? selectedUserGroup.value : "User/Group"} is able to see only rows for these Countries`}
                  >
                  <Link variant="info">Info</Link>
                </Popover>
                } 
            >
              <Input
                disabled={formFilterValueInputDisabled}
                value={filterValues}
                placeholder="Add a Comma-Separated list of values"
                onChange={event => {
                  const newValue = event.detail.value;
                  setFilterValues(newValue);
                  if(newValue!="" && newValue!=undefined && newValue!=null){
                    setNewPermissionButtonDisabled(false)
                  }else{
                    setNewPermissionButtonDisabled(true)
                  }
                }}
              />
            </FormField>
            { modalErrorText && modalErrorText != undefined ? ( 
            <Alert
              type={modalErrorText.type}
              header={modalErrorText.header}
              dismissible
              onDismiss={ () => setModalErrorText(null)}
            >
              {modalErrorText.message}
            </Alert>) : (null)
            }
          </SpaceBetween>

        </Modal>

        {/* RLS Dataset Visibility Modal */}
        <Modal
          visible={rlsVisibilityModalVisible}
          onDismiss={() => setRlsVisibilityModalVisible(false)}
          header="Manage RLS Dataset Visibility"
          size="large"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setRlsVisibilityModalVisible(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={saveAndApplyVisibility}
                  loading={savingVisibility}
                >
                  Save & Apply to QuickSight
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Alert type="info">
              Control who can see and manage this RLS Dataset in QuickSight.
              <ul>
                <li><strong>Owner</strong>: Full control (view, edit, delete, manage permissions)</li>
                <li><strong>Viewer</strong>: Read-only access (view dataset details and refresh status)</li>
              </ul>
              <strong>Status indicators:</strong>
              <ul>
                <li><Badge color="green">Synced</Badge> - Stored in database and applied to QuickSight</li>
                <li><Badge color="severity-low">QuickSight only</Badge> - Exists in QuickSight but not in our database (will be synced on save)</li>
                <li><Badge color="blue">New</Badge> - Added but not yet saved (click "Save & Apply" to persist)</li>
              </ul>
            </Alert>

            <Container header={<Header variant="h3">Current Visibility</Header>}>
              <Table
                items={rlsVisibilityList}
                sortingDisabled={false}
                columnDefinitions={[
                  {
                    id: "type",
                    header: "Type",
                    sortingField: "userGroupType",
                    cell: item => (
                      <Badge color={item.userGroupType === "USER" ? "blue" : "green"}>
                        {item.userGroupType === "USER" ? "User" : "Group"}
                      </Badge>
                    )
                  },
                  {
                    id: "name",
                    header: "Name",
                    sortingField: "name",
                    cell: item => item.name
                  },
                  {
                    id: "permissionLevel",
                    header: "Permission Level",
                    sortingField: "permissionLevel",
                    cell: item => (
                      <Badge color={item.permissionLevel === "OWNER" ? "blue" : "green"}>
                        {item.permissionLevel}
                      </Badge>
                    )
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: item => {
                      if (item.isNew) {
                        return <Badge color="blue">New</Badge>;
                      } else if (item.fromQuickSight) {
                        return <Badge color="severity-low">QuickSight only</Badge>;
                      } else {
                        return <Badge color="green">Synced</Badge>;
                      }
                    }
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    cell: item => (
                      <Button
                        variant="icon"
                        iconName="remove"
                        onClick={() => removeVisibility(item.id)}
                      />
                    )
                  }
                ]}
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No visibility configured</b>
                    <Box variant="p" color="inherit">
                      Add users or groups below to grant access to this RLS dataset.
                    </Box>
                  </Box>
                }
              />
            </Container>

            <Container header={<Header variant="h3">Add Visibility</Header>}>
              <SpaceBetween size="m">
                <FormField label="User or Group Type">
                  <Select
                    selectedOption={selectedVisibilityType}
                    onChange={({ detail }) => setSelectedVisibilityType(detail.selectedOption as SelectOption)}
                    options={[
                      { label: "User", value: "user" },
                      { label: "Group", value: "group" }
                    ]}
                    placeholder="Select type"
                  />
                </FormField>

                <FormField label="Select User/Group">
                  <Select
                    selectedOption={selectedVisibilityUserGroup}
                    onChange={({ detail }) => setSelectedVisibilityUserGroup(detail.selectedOption as SelectOption)}
                    options={visibilityUserGroupOptions}
                    placeholder="Choose a user or group"
                    filteringType="auto"
                    disabled={!selectedVisibilityType}
                  />
                </FormField>

                <FormField label="Permission Level">
                  <Select
                    selectedOption={selectedPermissionLevel}
                    onChange={({ detail }) => setSelectedPermissionLevel(detail.selectedOption as SelectOption)}
                    options={[
                      { label: "Owner - Full control", value: "OWNER" },
                      { label: "Viewer - Read-only", value: "VIEWER" }
                    ]}
                    placeholder="Select permission level"
                  />
                </FormField>

                <Button
                  onClick={addVisibility}
                  disabled={!selectedVisibilityUserGroup || !selectedPermissionLevel}
                  iconName="add-plus"
                >
                  Add
                </Button>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Modal>

        {/* CSV Import Preview Modal */}
        <Modal
          visible={importModalVisible}
          onDismiss={() => setImportModalVisible(false)}
          header="Import Permissions from CSV"
          size="max"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setImportModalVisible(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={confirmImport}
                  loading={importingPermissions}
                  disabled={importedPermissions.filter(p => p.isResolved).length === 0}
                >
                  Import {importedPermissions.filter(p => p.isResolved).length} Permission(s)
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Alert type="info">
              <strong>Detected Format:</strong> {importFormat}
              <br />
              <strong>Valid Permissions:</strong> {importedPermissions.filter(p => p.isResolved).length} / {importedPermissions.length}
            </Alert>

            {importErrors.length > 0 && (
              <Alert type="error" header="Errors">
                <ul>
                  {importErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {importWarnings.length > 0 && (
              <Alert type="warning" header="Warnings">
                <ul>
                  {importWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Alert type="info" header="How to Edit">
              <ul>
                <li><strong>Edit:</strong> Click on any Field or Values cell to edit inline, or use the edit button</li>
                <li><strong>Delete:</strong> Click the remove button to delete a permission row</li>
                <li><strong>Values:</strong> Leave empty or use "*" for wildcard (access to all values)</li>
              </ul>
            </Alert>

            <Alert type="warning" header="Important">
              <strong>Before importing:</strong>
              <ul>
                <li>Review and edit the permissions below to ensure they are correct</li>
                <li>After import, click "Publish RLS in QuickSight" to apply them</li>
                <li><strong>If this dataset already has RLS configured, you must manually remove it in QuickSight first</strong></li>
              </ul>
            </Alert>

            <Container header={<Header variant="h3">Preview Imported Permissions</Header>}>
              <Table
                items={importedPermissions.map((item, index) => ({ ...item, _index: index }))}
                columnDefinitions={[
                  {
                    id: "type",
                    header: "Type",
                    cell: item => (
                      <Badge color={item.userGroupType === "USER" ? "blue" : "green"}>
                        {item.userGroupType}
                      </Badge>
                    )
                  },
                  {
                    id: "name",
                    header: "Name",
                    cell: item => item.userGroupName
                  },
                  {
                    id: "field",
                    header: "Field",
                    cell: item => {
                      const isEditing = editingImportRow === item._index;
                      const displayField = item.field === '*' ? (
                        <Badge color="severity-neutral">* (All Fields)</Badge>
                      ) : item.field;
                      
                      return isEditing ? (
                        <Input
                          value={item.field}
                          onChange={({ detail }) => editImportedPermission(item._index, 'field', detail.value)}
                          onBlur={() => setEditingImportRow(null)}
                        />
                      ) : (
                        <span style={{ cursor: 'pointer' }} onClick={() => setEditingImportRow(item._index)}>
                          {displayField}
                        </span>
                      );
                    }
                  },
                  {
                    id: "values",
                    header: "Values",
                    cell: item => {
                      const isEditing = editingImportRow === item._index;
                      const displayValue = item.rlsValues || '*';
                      
                      return isEditing ? (
                        <Input
                          value={item.rlsValues || ''}
                          onChange={({ detail }) => editImportedPermission(item._index, 'rlsValues', detail.value)}
                          onBlur={() => setEditingImportRow(null)}
                          placeholder="* for all values"
                        />
                      ) : (
                        <span style={{ cursor: 'pointer' }} onClick={() => setEditingImportRow(item._index)}>
                          {displayValue === '*' ? (
                            <Badge color="severity-neutral">* (All)</Badge>
                          ) : displayValue}
                        </span>
                      );
                    }
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: item => item.isResolved ? (
                      <Badge color="green">Resolved</Badge>
                    ) : (
                      <Badge color="red">Not Found</Badge>
                    )
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    cell: item => (
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          variant="icon"
                          iconName="edit"
                          onClick={() => setEditingImportRow(item._index)}
                          disabled={editingImportRow !== null}
                        />
                        <Button
                          variant="icon"
                          iconName="remove"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this permission?')) {
                              deleteImportedPermission(item._index);
                            }
                          }}
                        />
                      </SpaceBetween>
                    )
                  }
                ]}
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No permissions to preview</b>
                  </Box>
                }
              />
            </Container>
          </SpaceBetween>
        </Modal>

        {/* Publish RLS Progress Modal */}
        <Modal
          visible={publishModalVisible}
          onDismiss={() => {
            if (publishComplete) {
              setPublishModalVisible(false);
            }
          }}
          header="Publishing RLS to QuickSight"
          size="large"
          footer={
            publishComplete ? (
              <Box float="right">
                <Button 
                  variant="primary" 
                  onClick={() => setPublishModalVisible(false)}
                >
                  OK
                </Button>
              </Box>
            ) : null
          }
        >
          <SpaceBetween size="l">
            {!publishComplete && (
              <Alert type="info" header="Publishing in progress">
                Please wait while we publish your RLS permissions to QuickSight. This may take a few moments.
              </Alert>
            )}

            {publishComplete && !publishHasErrors && errorsCount === 0 && warningsCount === 0 && (
              <Alert type="success" header="Success">
                RLS permissions have been published successfully to QuickSight!
              </Alert>
            )}

            {publishComplete && (publishHasErrors || errorsCount > 0 || warningsCount > 0) && (
              <Alert type="error" header="Completed with issues">
                The publish operation completed but there were {errorsCount > 0 ? `${errorsCount} error(s)` : ''} {errorsCount > 0 && warningsCount > 0 ? 'and' : ''} {warningsCount > 0 ? `${warningsCount} warning(s)` : ''}. 
                Please check the logs in the "Status and Logs" section below for details.
              </Alert>
            )}

            <Steps 
              steps={getStepsForAction().map(step => ({
                ...step,
                statusIconAriaLabel: step.status
              }))}
            />
          </SpaceBetween>
        </Modal>

        {/* Remove All Permissions Confirmation Modal */}
        <Modal
          visible={removeAllModalVisible}
          onDismiss={() => {
            setRemoveAllModalVisible(false);
            setRemoveAllConfirmText('');
          }}
          header="Remove All Permissions"
          size="medium"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button 
                  variant="link" 
                  onClick={() => {
                    setRemoveAllModalVisible(false);
                    setRemoveAllConfirmText('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={removeAllPermissions}
                  loading={removingAllPermissions}
                  disabled={removeAllConfirmText !== 'Delete'}
                >
                  Remove All
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Alert type="error" header="Warning: This action cannot be undone">
              This will permanently:
              <ul>
                <li>Delete all permissions from the database</li>
                <li>Delete the S3 RLS file (if exists)</li>
                <li>Delete the QuickSight RLS dataset (if exists)</li>
                <li>Remove RLS configuration from the main dataset</li>
                <li>Set the dataset RLS status to DISABLED</li>
              </ul>
            </Alert>

            <FormField
              label={
                <>
                  To confirm, type <strong>Delete</strong> in the field below
                </>
              }
            >
              <Input
                value={removeAllConfirmText}
                onChange={({ detail }) => setRemoveAllConfirmText(detail.value)}
                placeholder="Delete"
              />
            </FormField>

            {selectedDataset && (
              <Box>
                <strong>Dataset:</strong> {selectedDataset.dataSetName}
                <br />
                <strong>Permissions to remove:</strong> {permissionsList.filter(p => p.dataSetArn === selectedDataset.dataSetArn).length}
              </Box>
            )}
          </SpaceBetween>
        </Modal>

        {/* Rollback Version Confirmation Modal */}
        <Modal
          visible={rollbackModalVisible}
          onDismiss={() => {
            setRollbackModalVisible(false);
            setSelectedVersion(null);
          }}
          header="Rollback to Previous Version"
          size="medium"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button 
                  variant="link" 
                  onClick={() => {
                    setRollbackModalVisible(false);
                    setSelectedVersion(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => selectedVersion && handleRollback(selectedVersion.versionId)}
                >
                  Confirm Rollback
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Alert type="warning" header="Review Before Publishing">
              This will restore permissions from a previous version. The restored permissions will be imported for your review.
              You must click "Publish RLS in QuickSight" to apply them.
            </Alert>

            {selectedVersion && (
              <Box>
                <strong>Version ID:</strong> {selectedVersion.versionId?.substring(0, 16)}...
                <br />
                <strong>Published:</strong> {selectedVersion.lastModified ? new Date(selectedVersion.lastModified).toLocaleString() : '-'}
                <br />
                <strong>Size:</strong> {selectedVersion.size ? `${(selectedVersion.size / 1024).toFixed(2)} KB` : '-'}
              </Box>
            )}

            <Alert type="info">
              <strong>What happens next:</strong>
              <ol>
                <li>The previous version will be restored from S3</li>
                <li>Permissions will be imported and shown for review</li>
                <li>You can review and modify before publishing</li>
                <li>Click "Publish" to apply the restored permissions</li>
              </ol>
            </Alert>
          </SpaceBetween>
        </Modal>

        {/* Version Preview Modal */}
        <Modal
          visible={versionPreviewModalVisible}
          onDismiss={() => {
            setVersionPreviewModalVisible(false);
            setSelectedVersion(null);
            setVersionPreviewContent('');
            setImportedPermissions([]);
          }}
          header={`Version Preview${selectedVersion ? ` - ${selectedVersion.versionId?.substring(0, 16)}...` : ''}`}
          size="large"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button 
                  variant="link" 
                  onClick={() => {
                    setVersionPreviewModalVisible(false);
                    setSelectedVersion(null);
                    setVersionPreviewContent('');
                    setImportedPermissions([]);
                  }}
                >
                  Close
                </Button>
                {selectedVersion && !selectedVersion.isLatest && (
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      setVersionPreviewModalVisible(false);
                      setRollbackModalVisible(true);
                    }}
                  >
                    Rollback to This Version
                  </Button>
                )}
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            {selectedVersion && (
              <Box>
                <strong>Version ID:</strong> {selectedVersion.versionId?.substring(0, 16)}...
                <br />
                <strong>Published:</strong> {selectedVersion.lastModified ? new Date(selectedVersion.lastModified).toLocaleString() : '-'}
                <br />
                <strong>Size:</strong> {selectedVersion.size ? `${(selectedVersion.size / 1024).toFixed(2)} KB` : '-'}
                <br />
                <strong>Status:</strong> {selectedVersion.isLatest ? <Badge color="green">Latest</Badge> : <Badge color="grey">Historical</Badge>}
              </Box>
            )}

            {versionPreviewLoading ? (
              <Box textAlign="center" padding="l">
                <Spinner size="large" />
                <Box variant="p" color="text-body-secondary">
                  Loading version content...
                </Box>
              </Box>
            ) : (
              <>
                <Alert type="info">
                  <strong>Detected Format:</strong> {importFormat}
                </Alert>

                {importErrors.length > 0 && (
                  <Alert type="error" header="Errors">
                    <ul>
                      {importErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {importWarnings.length > 0 && (
                  <Alert type="warning" header="Warnings">
                    <ul>
                      {importWarnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Container header={<Header variant="h3">Permissions in This Version</Header>}>
                  <Table
                    items={importedPermissions}
                    columnDefinitions={[
                      {
                        id: "userGroupName",
                        header: "User/Group",
                        cell: (item) => (
                          <Box>
                            {item.userGroupName}
                            {!item.isResolved && (
                              <Box color="text-status-error" fontSize="body-s">
                                <Icon name="status-warning" /> Not found
                              </Box>
                            )}
                          </Box>
                        )
                      },
                      {
                        id: "userGroupType",
                        header: "Type",
                        cell: (item) => (
                          <Badge color={item.userGroupType === 'USER' ? 'blue' : 'green'}>
                            {item.userGroupType}
                          </Badge>
                        )
                      },
                      {
                        id: "field",
                        header: "Field",
                        cell: (item) => item.field
                      },
                      {
                        id: "rlsValues",
                        header: "Values",
                        cell: (item) => item.rlsValues
                      }
                    ]}
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No permissions found</b>
                      </Box>
                    }
                  />
                </Container>

                <ExpandableSection
                  headerText="Raw CSV Content"
                  variant="footer"
                >
                  <CodeView
                    content={versionPreviewContent || 'No content available'}
                    lineNumbers
                    wrapLines
                  />
                </ExpandableSection>
              </>
            )}
          </SpaceBetween>
        </Modal>

        {/* Copy Permissions Modal */}
        <Modal
          visible={copyPermissionsModalVisible}
          onDismiss={() => {
            setCopyPermissionsModalVisible(false);
            setCopyFromDataset(null);
            setCopyFromPermissions([]);
            setIncompatiblePermissions(new Set());
          }}
          header="Copy Permissions from Another Dataset"
          size="max"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button 
                  variant="link" 
                  onClick={() => {
                    setCopyPermissionsModalVisible(false);
                    setCopyFromDataset(null);
                    setCopyFromPermissions([]);
                    setIncompatiblePermissions(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={copyPermissionsFromDataset}
                  loading={copyingPermissions}
                  disabled={!copyFromDataset || copyFromPermissions.length === 0 || (copyFromPermissions.length - incompatiblePermissions.size) === 0}
                >
                  Copy {copyFromPermissions.length - incompatiblePermissions.size} Compatible Permission(s)
                  {incompatiblePermissions.size > 0 && ` (${incompatiblePermissions.size} skipped)`}
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="l">
            <Alert type="info">
              Select a dataset to copy permissions from. The permissions will be copied to <strong>{selectedDataset?.label}</strong> with status <Badge color={selectedDataset?.apiManageable === false ? "severity-medium" : "blue"}>{selectedDataset?.apiManageable === false ? "Manual" : "Pending"}</Badge>.
            </Alert>

            {incompatiblePermissions.size > 0 && (
              <Alert type="warning" header="Field Compatibility Warning">
                <strong>{incompatiblePermissions.size}</strong> permission(s) reference fields that don't exist in the destination dataset <strong>{selectedDataset?.label}</strong>. 
                These permissions are highlighted below and will be <strong>skipped</strong> during the copy operation. Only compatible permissions will be copied.
              </Alert>
            )}

            <FormField label="Select Dataset">
              <Select
                selectedOption={copyFromDataset as any}
                options={datasetOptions.filter(opt => opt.value !== selectedDataset?.value)}
                onChange={async ({ detail }) => {
                  const selectedDetails = datasetsList.find(ds => ds.dataSetId === detail.selectedOption.value);
                  if (selectedDetails) {
                    const dataset: SelectedDataset = {
                      value: detail.selectedOption.value || '',
                      label: detail.selectedOption.label || '',
                      description: detail.selectedOption.description,
                      dataSetArn: selectedDetails.dataSetArn,
                      dataSetId: selectedDetails.dataSetId,
                      dataSetName: selectedDetails.name,
                      region: selectedDetails.dataSetRegion,
                      fieldTypes: selectedDetails.fieldTypes,
                      rlsToolManaged: selectedDetails.rlsToolManaged,
                      rlsDataSetId: selectedDetails.rlsDataSetId || "",
                      rlsEnabled: selectedDetails.rlsEnabled,
                      rlsS3Key: selectedDetails.glueS3Id,
                      rlsS3BucketName: selectedRegion?.value ? regionsList?.find(r => r.regionName === selectedRegion.value)?.s3BucketName : undefined,
                      lastUpdatedTime: selectedDetails.updatedAt,
                      apiManageable: selectedDetails.apiManageable
                    };
                    setCopyFromDataset(dataset);
                    
                    // Fetch permissions from selected dataset
                    const perms = await fetchPermissionsFromDataset(selectedDetails.dataSetArn);
                    setCopyFromPermissions(perms);
                    
                    // Validate field compatibility
                    if (selectedDataset?.fieldTypes) {
                      const destinationFields = JSON.parse(selectedDataset.fieldTypes);
                      const destinationFieldNames = Object.keys(destinationFields);
                      const incompatible = new Set<number>();
                      
                      perms.forEach((perm, index) => {
                        // Check if permission field exists in destination dataset
                        // Skip "*" (All Fields) as it's always compatible
                        if (perm.field !== "*" && !destinationFieldNames.includes(perm.field)) {
                          incompatible.add(index);
                        }
                      });
                      
                      setIncompatiblePermissions(incompatible);
                    }
                  }
                }}
                placeholder="Choose a dataset"
                filteringType="auto"
              />
            </FormField>

            {copyFromDataset && (
              <Container header={<Header variant="h3">Permissions Preview ({copyFromPermissions.length})</Header>}>
                {copyFromPermissions.length === 0 ? (
                  <Box textAlign="center" color="inherit">
                    <p>No permissions found in this dataset</p>
                  </Box>
                ) : (
                  <Table
                    items={copyFromPermissions.map((perm, index) => ({ ...perm, _index: index }))}
                    columnDefinitions={[
                      {
                        id: "status",
                        header: "Status",
                        cell: item => {
                          const isIncompatible = incompatiblePermissions.has(item._index);
                          return isIncompatible ? (
                            <Badge color="red">Incompatible</Badge>
                          ) : (
                            <Badge color="green">Compatible</Badge>
                          );
                        },
                        width: 120
                      },
                      {
                        id: "userGroup",
                        header: "User/Group",
                        cell: item => item.userGroupArn.split(':')[5].split('/').slice(2).join('/')
                      },
                      {
                        id: "field",
                        header: "Field",
                        cell: item => {
                          const isIncompatible = incompatiblePermissions.has(item._index);
                          return (
                            <Box>
                              {item.field}
                              {isIncompatible && (
                                <Box variant="small" color="text-status-error" margin={{ top: "xxxs" }}>
                                  ⚠ Field not found in destination
                                </Box>
                              )}
                            </Box>
                          );
                        }
                      },
                      {
                        id: "values",
                        header: "Values",
                        cell: item => item.rlsValues
                      }
                    ]}
                    variant="embedded"
                    stripedRows
                  />
                )}
              </Container>
            )}
          </SpaceBetween>
        </Modal>

      </ContentLayout>
    </>


  )
}

export default AddPermissionPage;