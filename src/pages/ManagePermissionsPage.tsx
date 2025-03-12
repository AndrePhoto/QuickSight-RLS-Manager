// NEW
import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Badge, BreadcrumbGroup, Container, ContentLayout, CopyToClipboard, 
  FormField, Header, KeyValuePairs, Popover, Select, SpaceBetween, TextContent, Table, Input, Box, 
  Button,
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
  fields: string[];
  rlsDataSetId: string;
  rlsToolManaged: boolean;
  spiceCapacityInBytes: number;
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
  dataSetArn: string;
  dataSetId: string;
  fields: string[];
  rlsToolManaged: boolean; 
  rlsDataSetId: string;
  rlsEnabled: string;
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
  const [datasetOptions, setDatasetOptions] = useState<{value: string, label: string, tags: string[]}[]>([]); // DataSet List in option format for the Select DataSet
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

  // Steps step5_updatingMainDataSet,
  const [step0_validating, set_step0_validating] = useState<StepStatus>(StepStatus.STOPPED)
  const [step1_s3, set_step1_s3] = useState<StepStatus>(StepStatus.STOPPED)
  const [step2_glue, set_step2_glue] = useState<StepStatus>(StepStatus.STOPPED)
  const [step3_publishingRLS, set_step3_publishingRLS] = useState<StepStatus>(StepStatus.STOPPED)
  const [step4_updatingMainDataSet, set_step4_updatingMainDataSet] = useState<StepStatus>(StepStatus.STOPPED)
  const [step5_refreshingRlsTool, set_step5_refreshingRlsTool] = useState<StepStatus>(StepStatus.STOPPED)

  // Last Updated
  const [ permissionLastUpdate, setPermissionLastUpdate ] = useState<Date>(new Date(0))

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
            apiManageable: {
              eq: true
            },
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
        tags: [dataset.dataSetId, "RLS: "+dataset.rlsEnabled]
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

  // Delete All Permissions for a User/Group
  const deleteAllPermissionsForUserGroup = async (userGroupArn: string) => {

    const listToDelete = await client.models.Permission.list(
      {filter:
        {userGroupArn:{
          eq: userGroupArn
        }}
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
    try{
      if( rlsValues === ""  ){
        throw new Error("No values for filters provided");
      }
      if( field === "" ){
        throw new Error("No field selected");
      }
      if( userGroupArn === "" ){
        throw new Error("No group/user entity selected");
      }
      if( dataSetArn === ""){
        throw new Error("No dataset selected");
      }

      const response = await client.models.Permission.create({
        dataSetArn: dataSetArn,
        userGroupArn: userGroupArn,
        field: field,
        rlsValues: rlsValues,
      })
      if( response?.errors ){
        throw new Error(response.errors[0].message);
      }
      setModalVisible(false)
      fetchPermissions()
    } catch (err) {
      console.error('Error creating permission:', err);
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
    setLogs("")
    setStatusIndicator({status: "loading", message: "Publishing Permission in progress"})
  
    addLog("Publishing RLS Permissions to QuickSight")
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

      await fetchDatasets(selectedRegion.value);

      setStatusIndicator({status:"success", message:"Ok"})
      
      // Refresh DataSet List
      //addLog("Refreshing DataSet List")
      // fetchDatasets(selectedRegion.value) fetch does not work here, need to subscribe or just update and keep the selected dataset

    } catch (err) {
      console.error('Error publishing permissions:', err);
      addLog('Error publishing permissions: ' + err, "ERROR", 500, "PublishingPermissionError")
    }finally{
      setPublishQSRLSLoading(false)
    }
  
  }
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
              message: "RLS is enabled and RLS Tool Managed is true, but there are no permissions defined. Try refreshing the Permissions List or the Region data from Global Settings page."
          });
        break
      case ((rls && !tool) || (!rls && !tool)) && hasPermissions: // true, false, true OR false, false, true
        setPermissionStatusIndicator ({
              status: "warning",
              message: "There are some Permissions defined, but RLS is disabled or not managed by the RLS Tool. Please push the RLS to QuickSight or try refreshing the Region data from Global Settings page."
          });
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

  }, [permissionsList]);

  useEffect(() => {
    changeStatusIndicator()
  }, [errorsCount, warningsCount]);

  useEffect(() => {
    if (selectedDataset && selectedDataset?.dataSetArn) {
      fetchPermissions();
    }
  }, [selectedDataset]);
  
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
          fields: selectedDatasetDetails.fields,
          rlsToolManaged: selectedDatasetDetails.rlsToolManaged,
          rlsDataSetId: selectedDatasetDetails.rlsDataSetId || "",
          rlsEnabled: selectedDatasetDetails.rlsEnabled,
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

    if(permissionsList.length > 0){
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
        <Header variant="h3">Row Level Security Rules:</Header>
        <TextContent>
          <ul>
            <li><strong>Anyone whom you shared your dashboard with can see all the data in it, unless the dataset is restricted by dataset rules.</strong></li>
            <li>Each user or group specified can see only the rows that match the field values in the dataset rules.</li>
            <li>f you add a rule for a user or group and leave all other columns with no value <i>(NULL)</i>, you grant them access to all the data.</li>
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
                  selectedOption={selectedDataset}
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
                      dataSetArn: selectedDatasetDetails.dataSetArn,
                      dataSetId: selectedDatasetDetails.dataSetId,
                      fields: selectedDatasetDetails.fields,
                      rlsToolManaged: selectedDatasetDetails.rlsToolManaged,
                      rlsDataSetId: selectedDatasetDetails.rlsDataSetId || "",
                      rlsEnabled: selectedDatasetDetails.rlsEnabled,
                      lastUpdatedTime: selectedDatasetDetails.updatedAt
                    };
                    
                    setSelectedDataset(newSelectedDataset);
                  }}
                  placeholder="Choose a DataSet"
                  empty="No DataSets found."
                  virtualScroll
                  filteringType="auto"
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
                          {
                            label: "Name",
                            value:   (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy Name"
                                copyErrorText="Name failed to copy"
                                copySuccessText="Name copied"
                                textToCopy={datasetDetails.name}
                                variant="inline"
                              />
                            )
                          },
                          {
                            label: "ID",
                            value:  (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy ID"
                                copyErrorText="ID failed to copy"
                                copySuccessText="ID copied"
                                textToCopy={datasetDetails.dataSetId}
                                variant="inline"
                              />
                            )
                          },
                          {
                            label: "ARN",
                            value:  (
                              <CopyToClipboard
                                copyButtonAriaLabel="Copy ARN"
                                copyErrorText="ARN failed to copy"
                                copySuccessText="ARN copied"
                                textToCopy={datasetDetails.dataSetArn}
                                variant="inline"
                              />
                            )
                          },
                          {
                            label: "Import Mode",
                            value: datasetDetails.importMode,
                          },
                          ...(datasetDetails.spiceCapacityInBytes ? [{
                            label: "Consumed SPICE Capacity",
                            value: formatBytes(datasetDetails.spiceCapacityInBytes)
                          }] : []),
                          {
                            label: "Created Time",
                            value: datasetDetails.createdTime,
                          },
                          {
                            label: "Last Updated",
                            value: datasetDetails.lastUpdatedTime,
                          },
                          {
                            label: "RLS Enabled",
                            value: (<Badge color={datasetDetails.rlsEnabled === "ENABLED" ? (datasetDetails.rlsToolManaged === true 
                              ? "green" 
                              : "severity-medium") : "severity-neutral"}>
                              {datasetDetails.rlsEnabled}
                            </Badge>),
                          },
                          ...(datasetDetails.rlsEnabled === "ENABLED" ? [
                            {
                              label: "RLS Dataset ARN",
                              value:  (
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
                description={<StatusIndicator type={permissionStatusIndicator.status as StatusIndicatorProps.Type}>{permissionStatusIndicator.message}</StatusIndicator>}
                variant="h2"
                actions={
                  <SpaceBetween
                  direction="horizontal"
                  size="xs"
                  >
                    <Button
                      onClick={() => {
                        fetchPermissions();
                      }}  
                    >
                      <Icon name="refresh"/>
                      
                    </Button>
                    <Button
                      onClick={() => setModalVisible(true)}  
                      variant="primary"
                    >
                      <Icon name="add-plus"/>
                      <> Add Permission</>
                    </Button>
                    <Button
                      onClick={() => publishQSRLSPermissionsClickHandler()}  
                      variant="primary"
                      disabled={publishQSRLSDisabled}
                      loading={publishQSRLSLoading}
                    >
                      <Icon name="thumbs-up"/>
                      <> Publish RLS in QuickSight</>
                    </Button>
                    
                  </SpaceBetween>
                }
              >
                Permissions
              </Header>
            }
          >
            <SpaceBetween size="l">
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
                    { id: "permissionId", visible: false },
                    { id: "delete", visible: true},
                  ]
                }
                columnDefinitions={[
                  { id: "permissionId", header: "Permission ID", cell: (item: any) => item.permissionId, },
                  { id: "userGroup", header: "User/Group", cell: (item: any) => item.userGroup, },
                  { id: "name", header: "Resource Name", cell: (item: any) => item.name, },
                  { id: "arn", header: "Resource ARN", cell: (item: any) => item.arn, },
                  { id: "field", header: "Field", cell: (item: any) => item.field, },
                  {
                    id: "values",
                    header: "Values",
                    cell: item => {
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
            </SpaceBetween>

          </Container>
          )}
          {
            seeCSVOutput && (
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
          <ExpandableSection 
              headerText={
                <>
                  {"Status and Logs: "}<StatusIndicator type={statusIndicator.status as StatusIndicatorProps.Type}>{statusIndicator.message}</StatusIndicator>
                </>
              } 
              variant="container">  
            <SpaceBetween size="l">
              <Steps 
                steps={[
                  {
                    status: step0_validating,
                    header: "Validating RLS Tool Resources",
                    statusIconAriaLabel: step0_validating
                  },
                  {
                    status: step1_s3,
                    header: "Publishing new Permissions in S3",
                    statusIconAriaLabel: step1_s3
                  },
                  {
                    status: step2_glue,
                    header: "Updating Glue Database",
                    statusIconAriaLabel: step2_glue
                  },
                  {
                    status: step3_publishingRLS,
                    header: "Updating RLS DataSet in QuickSight",
                    statusIconAriaLabel: step3_publishingRLS
                  },
                  {
                    status: step4_updatingMainDataSet,
                    header: "Applying RLS Permissions to Main DataSet",
                    statusIconAriaLabel: step4_updatingMainDataSet
                  },
                  {
                    status: step5_refreshingRlsTool,
                    header: "Refreshiing RLS Tool",
                    statusIconAriaLabel: step5_refreshingRlsTool
                  }
                ]}
              />
              <CodeView 
                content={ logs }
                lineNumbers
                wrapLines
              />
            </SpaceBetween>
          </ExpandableSection>
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
                            await deleteAllPermissionsForUserGroup(selectedUserGroupArn.value)
                            addLog("Deleted all previous permissions related to entity: " + selectedUserGroupArn.value)
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
                  // map the fields in the selectedDataset.field
                  selectedDataset?.fields?.map((field: any) => {
                    return {
                      label: field,
                      value: field
                    }
                  }) || []
                }
                />
            </FormField>
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
      </ContentLayout>
    </>


  )
}

export default AddPermissionPage;