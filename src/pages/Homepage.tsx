import { useEffect, useState } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { BreadcrumbGroup, Button, Container, ContentLayout, Form, FormField, Header, SpaceBetween, Select, Table,
  Box, Link, ExpandableSection, Spinner, Steps, Multiselect, MultiselectProps, NonCancelableCustomEvent, StatusIndicator, StatusIndicatorProps, Modal, TextContent, Tabs,
  KeyValuePairs, CopyToClipboard, ProgressBar,
  Toggle,
  Checkbox
} from "@cloudscape-design/components";

import { CodeView } from "@cloudscape-design/code-view"

import { useHelpPanel } from '../contexts/HelpPanelContext';

// Define valid AWS region options with labels 
import { REGION_OPTIONS } from "../hooks/REGION_OPTIONS"
import { qs_fetchNamespaces } from "../hooks/qs_fetchNamespaces";
import { qs_fetchGroups } from "../hooks/qs_fetchGroups";
import { qs_fetchUsers } from "../hooks/qs_fetchUsers";
import { regionSetup } from "../hooks/regionSetup";
import { regionDelete } from "../hooks/regionDelete";

const enum StepStatus {
  SUCCESS = 'success',
  STOPPED = 'stopped',
  ERROR = 'error',
  WARNING = 'warning',
  LOADING = 'loading'
}

type Counters = {
  namespacesCount: number | null;
  groupsCount: number | null;
  usersCount: number | null;
};

interface RegionDetails {
  regionName: string;
  availableCapacityInGB: number;
  usedCapacityInGB: number;
  s3BucketName: string;
  glueDatabaseName: string;
  qsDataSource: string;
  datasetsCount: number;
  toolCreatedCount: number;
  notManageableDatasetsCount: number;
}

// Define Schema to get Models from backend.
const client = generateClient<Schema>();

function Homepage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  // Account Details Variables
  const [accountInitExecuted, setAccountInitExecuted] = useState<Boolean>(false)
  const [accountId, setaccountId] = useState<string>("")
  const [qsManagementRegion, setQsManagementRegion] = useState<string>("")
  const [qsManagementRegionSelect, setQsManagementRegionSelect] = useState<{ value: string, label: string } | null>(null);

  const [validationError, setValidationError] = useState<string>("")
  const [loading, setLoading] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [logs, setLogs] = useState<string>("")

  const [counters, setCounters] = useState<Counters | undefined>(undefined);

  const [accountLoadingCheck, setAccountLoadingCheck] = useState<boolean>(true)

  // Steps
  const [step_validateManagementRegion, set_step_validateManagementRegion] = useState<StepStatus>(StepStatus.STOPPED)
  const [step_accountSetUp, set_step_accountSetUp] = useState<StepStatus>(StepStatus.STOPPED)
  const [step_qsNamespaces, set_step_qsNamespaces] = useState<StepStatus>(StepStatus.STOPPED)
  const [step_qsGroups, set_step_qsGroups] = useState<StepStatus>(StepStatus.STOPPED)
  const [step_qsUsers, set_step_qsUsers] = useState<StepStatus>(StepStatus.STOPPED)
  const [step_initFinalizing, set_step_initFinalizing] = useState<StepStatus>(StepStatus.STOPPED)

  // Managed Regions
  const [selectedRegions, setSelectedRegions] = useState<MultiselectProps.Option[]>([]);
  const [selectedRegionsDetails, setSelectedRegionsDetails] = useState<RegionDetails[]>([]);

  const [statusIndicator, setStatusIndicator] = useState<{status: string, message: string}>({status: "success", message: "ok"})

  const [errorsCount, setErrorsCount] = useState<number>(0)
  const [warningsCount, setWarningsCount] = useState<number>(0)

  const [isEditingRegions, setIsEditingRegions] = useState<boolean>(false)
  const [tempSelectedRegions, setTempSelectedRegions] = useState<MultiselectProps.Option[]>(selectedRegions);

  // Delete Regions
  const [modalDeleteRegion, setModalDeleteRegion] = useState<boolean>(false)
  const [regionToDelete, setRegionToDelete] = useState<string>("")

  const [toggleS3checked, setToggleS3checked] = useState<boolean>(false)
  const [toggleGluechecked, setToggleGluechecked] = useState<boolean>(false)
  const [toggleQSDatachecked, setToggleQSDatahecked] = useState<boolean>(false)

  const [deletionAckChecked, setDeletionAckChecked] = useState<boolean>(false)

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
   * Reset Errors and Warnings
   */
  const resetErrorsAndWarnings = async () => {
    setErrorsCount(0)
    setWarningsCount(0)
    setValidationError("")
    setStatusIndicator({message: "Ok", status: "success"})
    setLogs("")
}

  /**
   * QuickSight Management Region Validation
   */
  const checkValidQsManagementRegion = async () => {
    setWarningsCount(0)
    setErrorsCount(0)
    
    // QS Management Region Validation
    set_step_validateManagementRegion(StepStatus.LOADING)
    // Is qsManagementRegionSelect variable is not set -> Launch a Warning

    if (!qsManagementRegionSelect) {
      setValidationError("QuickSight Management Region is required");
      addLog("QuickSight Management Region is required", "WARNING")
      setLoading(false);
      set_step_validateManagementRegion(StepStatus.WARNING)
      return false;
    }
    // Add a check that qsManagementRegionSelect.value is in REGION_OPTIONS
    if (!REGION_OPTIONS.find(option => option.value === qsManagementRegionSelect.value)) {
      setValidationError("Invalid QuickSight Management Region");
      setLoading(false);
      addLog("Invalid QuickSight Management Region", "WARNING")
      set_step_validateManagementRegion(StepStatus.WARNING)
      return false;
    }
    // Check IAM Authorization and correct Management Region
    const response = await client.queries.checkQSManagementRegionAccess({qsManagementRegion: qsManagementRegionSelect.value})
    if( response.data?.statusCode == 200 ){
      addLog("QuickSight Management Region validation successful.")
      return true
    }else{
      setValidationError("IAM Authorization failed or Management Region is incorrect");
      addLog("QuickSight Management Region validation failed. " + response.data?.errorMessage, "ERROR", response.data?.statusCode, ""+response.data?.errorName)
      set_step_validateManagementRegion(StepStatus.ERROR)
      return false;
    }
  }

  /**
   * Define the function that will be used during the INIT phase
   */
  const doAccountInit = async (isFirstInit: boolean = false) => {
    try {
      await resetErrorsAndWarnings()
      setLoading(true);
      setStatusIndicator({status:"loading", message:"Loading"})

      /**
       * QuickSight Management Region
       */

      let qsManagementRegionInit = ""
      // Management Region Validation: check if First Init and if QS Management Region is a valid input.
      if( isFirstInit ){
        if (! await checkValidQsManagementRegion()){
          setLoading(false);
          return
        }else{
          
          if(qsManagementRegionSelect == null){
            addLog("Failed to get QuickSight Management Region from Select Input in Form.", "ERROR", 500, "GenericError")
            setLoading(false);
            return;
          }

          set_step_validateManagementRegion(StepStatus.SUCCESS)

          set_step_accountSetUp(StepStatus.LOADING)
          qsManagementRegionInit = qsManagementRegionSelect?.value

          // Setting the Management Region in the AccountDetails schema.
          const response_setAccountRegion = await client.queries.setAccount({
            qsManagementRegion: qsManagementRegionInit,
            namespacesCount: 0,
            groupsCount: 0,
            usersCount: 0,
          })

          if( response_setAccountRegion.data?.statusCode == 200 ){
            addLog("QuickSight Management Region saved in the RLS Manager.")
            
          }else{
            addLog("Error saving the QuickSight Management Region", "ERROR", response_setAccountRegion.data?.statusCode, ""+response_setAccountRegion.data?.errorName)
            setLoading(false);
            set_step_accountSetUp(StepStatus.ERROR)
            return;
          }
        }
      } else {
        if( qsManagementRegion == "" ){
          addLog("QuickSight Management Region is not set. Init must be performed again.", "ERROR", 500, "GenericError")
          setLoading(false);
          set_step_accountSetUp(StepStatus.ERROR)
          return;
        }
        qsManagementRegionInit = qsManagementRegion // this is a const set with setQsManagementRegion
      }

      addLog("QuickSight Management Region: " + qsManagementRegionInit)
      set_step_accountSetUp(StepStatus.SUCCESS)

      /**
       * Retrieving Namespaces from QuickSight
       * Calling qs_fetchNamespaces hook
       */

      set_step_qsNamespaces(StepStatus.LOADING)
      const res_namespaces = await qs_fetchNamespaces({ qsManagementRegion: qsManagementRegionInit, addLog, isFirstInit })

      if( ! res_namespaces ){
        set_step_qsNamespaces(StepStatus.ERROR)
        throw new Error("Failed to fetch namespaces from QuickSight")
      }
      if( res_namespaces.status != 200 ){
        set_step_qsNamespaces(StepStatus.ERROR)
        throw new Error(res_namespaces.message)
      }

      // extract res_namespaces.namespacesList in a variable
      const namespacesList = res_namespaces.namespacesList

      if( namespacesList.length == 0){
        set_step_qsNamespaces(StepStatus.ERROR)
        throw new Error("No namespaces found in QuickSight")
      }
      set_step_qsNamespaces(StepStatus.SUCCESS)

      /**
       * Retrieving Groups from QuickSight
       * Callin qs_fetchGroups hook
       */

      set_step_qsGroups(StepStatus.LOADING)
      const res_groups = await qs_fetchGroups({ qsManagementRegion: qsManagementRegionInit, addLog, isFirstInit, namespacesList })

      if( ! res_groups ){
        set_step_qsGroups(StepStatus.ERROR)
        throw new Error("Failed to fetch groups from QuickSight")
      }
      if( res_groups.status != 200 ){
        set_step_qsGroups(StepStatus.ERROR)
        throw new Error(res_namespaces.message)
      }

      set_step_qsGroups(StepStatus.SUCCESS)

      /**
       * Retrieving Users from QuickSight
       * Callin qs_fetchUsers hook
       */
      set_step_qsUsers(StepStatus.LOADING)
      const res_users = await qs_fetchUsers({ qsManagementRegion: qsManagementRegionInit, addLog, isFirstInit, namespacesList })

      if( ! res_users ){
        set_step_qsUsers(StepStatus.ERROR)
        throw new Error("Failed to fetch users from QuickSight")
      }
      if( res_users.status != 200 ){
        set_step_qsUsers(StepStatus.ERROR)
        throw new Error(res_namespaces.message)
      }

      set_step_qsUsers(StepStatus.SUCCESS)
      set_step_initFinalizing(StepStatus.LOADING)
      // timeout 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setAccountInitExecuted(true)

      await fetchAccountDetails()

      set_step_initFinalizing(StepStatus.SUCCESS)
      setStatusIndicator({status:"success", message:"Ok"})
      addLog("===================================================================")
      addLog("Account Initialization completed successfully.")

    } catch (err) {
      console.error('Account Inititialization: ', err);
      addLog("Account Inititialization: " + err, "ERROR")
      setErrorsCount(errorsCount + 1) // OCCHIO A QUESTO ERROR COUNT
    } finally {
      setLoading(false);
      setAccountLoadingCheck(false)
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

  /**
   * Fetch Account Details (if set), otherwise do INIT!
   */

  const fetchAccountDetails = async () => {

    try {
      const response = await client.models.AccountDetails.list({
        authMode: 'userPool'
      });
      if (response.data.length > 0 && response.data[0]) { 
        setaccountId(response.data[0].accountId)
        setQsManagementRegion(response.data[0].qsManagementRegion)
        setCounters({
          namespacesCount: response.data[0].namespacesCount,
          groupsCount: response.data[0].groupsCount,
          usersCount: response.data[0].usersCount,
        })
        setAccountInitExecuted(true)

        // Fetching the ManagedRegions
        let fetchedSelectedRegions: MultiselectProps.Option[] = []
        const { data: resRegion, errors: errors } = await client.models.ManagedRegion.list()
        if( errors ){
          console.log(errors)
          addLog("Failed to retrieve Managed Regions details: " + errors, "ERROR", 500, "GraphQL-ListQueryError")
          setErrorsCount(errorsCount + 1)
        }else{
          if( resRegion.length > 0 ){
            for(const region of resRegion ){
              const regionOption = REGION_OPTIONS.find(option => option.value === region.regionName)
              if( regionOption ){
                fetchedSelectedRegions.push({
                  value: region.regionName,
                  label: regionOption.label,
                  description: regionOption.description
                })
              }else{
                addLog("Fetching Account Details: Region " + region.regionName + " not found in REGION_OPTIONS", "WARNING")
                setWarningsCount(warningsCount + 1)
              }
            }
            if(fetchedSelectedRegions.length > 0){
              setSelectedRegions(fetchedSelectedRegions)
            }else{
              addLog("Fetching Account Details: No regions found.", "WARNING")
              setWarningsCount(warningsCount + 1)
            }
          }
        }

      }else{
        console.warn("Fetching Account Details: Account Details are not available. Please enter them.")
        setAccountInitExecuted(false)
        return
      }




    } catch (err) {
      const error = err as Error
      addLog('Fetching Account Details: Error fetching Account Details:' + error.message, "ERROR", 500, "FetchAccountError");
      setErrorsCount(errorsCount + 1)
    } finally {
      setLoading(false);
      setAccountLoadingCheck(false)
    }
  };

  /**
   * UseEffect Hook
   */

  useEffect(() => {
    const getSelectedDatasetDetails = async () => {
      const { data: resRegion, errors: errors } = await client.models.ManagedRegion.list()
      if( errors ){
        console.log(errors)
        addLog("Failed to retrieve Managed Regions details: " + errors, "ERROR", 500, "GraphQL-ListQueryError")
        setErrorsCount(errorsCount + 1)
      }else{
        if( resRegion ){
          setSelectedRegionsDetails(resRegion)
        }else{
          addLog("Failed to retrieve Managed Regions details: No data returned", "ERROR", 500, "GraphQL-ListQueryError")
          setErrorsCount(errorsCount + 1)
        }
      }
    }

    getSelectedDatasetDetails()

  }, [selectedRegions]);

  useEffect(() => {
    const checkStatusIndicator = async () => {
      await changeStatusIndicator()
    }

    checkStatusIndicator()

  }, [errorsCount, warningsCount]);

  useEffect(() => {
    const checkAccountDetails = async () => {
      try{
        setWarningsCount(0)
        setErrorsCount(0)
        await fetchAccountDetails()
      }catch(err){
        console.log('Error: ', err)
        addLog("Error: " + err, "ERROR")
        setStatusIndicator({status:"error", message:"Error"})
      }
    }
    checkAccountDetails()
    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent>
          <p>Welcome to the <strong>QuickSight Row Level Security Manager.</strong></p>
        </TextContent>
        <Header variant="h3">Account Resources Details:</Header>
        <TextContent>
          <p>These are the resources created in you AWS Account.</p>
          <p>This tool will create some AWS resources for you. Here's how to find those resources.</p>
          <p>Here you can define the <strong>QuickSight Management Region</strong>, which is the AWS Region where you manage the access to QuickSight.</p>
          <p>Also you can define the AWS Regions for which you want to manage RLS with this tool.</p>
          <Box color="text-status-warning">NOTE: This tool will create IAM Permissions for you (see the Guide), but if there are other permission explicity denying access, the tool won't work correctly.</Box>
        </TextContent>
        <Header variant="h3">QuickSight Data:</Header>
        <TextContent>
          <p>These are the resources created in your QuickSight Account. You will only see the count related to the resources in the <strong>Managed Region</strong> selected in the previous panel.</p>
        </TextContent>
        <Header variant="h3">API Manageable:</Header>
        <TextContent>
          <ul>
            <li>
              <StatusIndicator type="success">Yes</StatusIndicator>: this DataSet can be managed by this tool.
            </li>
            <li>
            <StatusIndicator type="error">No</StatusIndicator>: this DataSet cannot be managed by this tool, since the APIs are not supported for the related ingestion mode (e.g. Direct File Upload)
            </li>
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



  return (
    <>
      <BreadcrumbGroup
        items={[
          { text: "QS RLS Manager", href: "/" },
          { text: "Home", href: "/" },
        ]}
      />
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
          >
          QuickSight Row Level Security Manager
          </Header>
        }
      >
        { accountLoadingCheck ? (
          <SpaceBetween alignItems="center" direction="horizontal" size="l">
            <Spinner /><Box>Checking your Account</Box>
          </SpaceBetween>
        ) : (
        <SpaceBetween size="l">
          { accountInitExecuted ? (
            <>
              <Container
              header={
                <Header
                  variant="h2"
                  >
                  Account Details
                </Header>
              }>
                <Table
                  loadingText="Loading QuickSight Account Data"
                  sortingDisabled
                  stripedRows
                  variant="embedded"
                  columnDefinitions={[
                    {
                      id: "aws_account_id",
                      header: "AWS Account ID",
                      cell: item => item.accountId,
                      isRowHeader: true
                    },
                    {
                      id: "qsManagementRegion",
                      header: "QuickSight Management Region",
                      cell: item => item.qsManagementRegion,
                    },
                  ]}
                  items={[
                    {
                      accountId: accountId,
                      qsManagementRegion: qsManagementRegion,
                      action: ""
                    },]}
                />
            </Container>
            <Container
              header={
                <Header
                  variant="h2"
                  description="You can find here macro-details on QuickSight Resources. Please refer to each page in the menu to see further details."
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        iconAlign="left"
                        iconName={loading ? undefined : "refresh"}
                        onClick={() => {
                          doAccountInit(false);
                        }}
                        disabled={loading}
                      >
                        {loading ? <Spinner /> : "Refresh Data"}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  QuickSight Resources
                </Header>
              }
            >
              <SpaceBetween size="l">
                <Table
                  loadingText="Loading QuickSight Account Data"
                  sortingDisabled
                  variant="embedded"
                  stripedRows
                  columnDefinitions={[
                    {
                      id: "resource",
                      header: "Resource",
                      cell: item => item.resource,
                      isRowHeader: true,
                      sortingField: "resource",
                    },
                    {
                      id: "element",
                      header: "Managed Elements",
                      cell: item => item.element,
                    }
                  ]}
                  items={[
                    {
                      resource: "Namespaces",
                      element: counters?.namespacesCount || 0
                    },
                    {
                      resource: "Groups",
                      element: counters?.groupsCount || 0
                    },
                    {
                      resource: "Users",
                      element: counters?.usersCount || 0,
                    },]}
                  />

              <Header
                description="These are the QuickSight Regions you want to manage with the RLS Manager. Select the Regions based on your needs."
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      iconName="refresh"
                      disabled={loadingRegions}
                      onClick={async () => {
                        setLoadingRegions(true)
                        setLogs("")

                        addLog("UPDATING Managed Regions Started.")
                        for( const region of selectedRegions ){
                          if( region.value ){
                            const resRegionUpdate = await regionSetup({ region: region.value, addLog: addLog } )
                            if( resRegionUpdate.status != 200 ){
                              addLog("Error trying to update region: " + region.value, "ERROR")
                              continue
                            }
                          }
                        }
    
                        addLog("===================================================================")
                        addLog("Managed Regions Update: COMPLETED.")
                        setLoadingRegions(false)
                      }}
                    >
                      Refresh All Regions Data
                    </Button>
                    <Button iconName="settings" 
                      variant="primary" 
                      disabled={loadingRegions}
                      onClick={() => {
                        setIsEditingRegions(true)
                        setTempSelectedRegions(selectedRegions)
                      }}
                    >
                      Add Regions
                    </Button>
                  </SpaceBetween>
                }
              >
                Active QuickSight Regions
              </Header>
              { loadingRegions ? ( 
                <SpaceBetween size="xxs" direction="vertical"><TextContent><strong>Updating Regions...</strong></TextContent><Spinner size="large"/></SpaceBetween>
                ) : ( 
                  <Tabs
                  tabs={
                    selectedRegionsDetails
                      .map(region => ({
                        label: REGION_OPTIONS.find(option => option.value === region.regionName)?.label || region.regionName,
                        id: region.regionName,
                        content:  
                          <SpaceBetween size="l">
                            <Header
                              actions={
                                <SpaceBetween direction="horizontal" size="xs">
                                  <Button
                                    iconName="refresh"
                                    disabled={loadingRegions}
                                    onClick={async () => {
                                      setLoadingRegions(true)
                                      setLogs("")
              
                                      addLog("UPDATING Managed Region: " + region.regionName + ".")

                                      const resRegionUpdate = await regionSetup({ region: region.regionName, addLog: addLog } )
                                      if( resRegionUpdate.status != 200 ){
                                        addLog("Error trying to update region: " + region.regionName, "ERROR")
                                      }
                  
                                      addLog("===================================================================")
                                      addLog("Managed Region Update: COMPLETED.")
                                      setLoadingRegions(false)
                                    }}
                                  >
                                    Refresh Region Data
                                  </Button>
                                  <Button
                                    iconName="remove"
                                    disabled={loadingRegions}
                                    onClick={() => {
                                      setModalDeleteRegion(true)
                                      setRegionToDelete(region.regionName)
                                    }}
                                  >
                                    Remove Region
                                  </Button>
                                </SpaceBetween>
                              }
                            >Region Details</Header>
                            <KeyValuePairs 
                              columns={3}
                              items={[
                                {
                                  label: "Region ID",
                                  value: region.regionName
                                },
                                {
                                  label: "SPICE",
                                  value: (
                                    <ProgressBar
                                      value= { region.availableCapacityInGB != 0 ? region.usedCapacityInGB / region.availableCapacityInGB * 100 : 0 }
                                      description= "Capacity Used"
                                      label={region.usedCapacityInGB + " GB / " + region.availableCapacityInGB  + " GB" }
                                    />)
                                },
                                {
                                  label: "DataSets",
                                  value: (<SpaceBetween size="xxxs">
                                    <TextContent><StatusIndicator type="success">Manageable DataSets</StatusIndicator>: {region.datasetsCount}</TextContent>
                                    <TextContent><StatusIndicator type="warning">Un-Manageable DataSets</StatusIndicator>: {region.notManageableDatasetsCount}</TextContent>
                                    <TextContent><StatusIndicator type="info">Created with RLS Manager</StatusIndicator>: {region.toolCreatedCount}</TextContent>
                                  </SpaceBetween>)
                                },
                                {
                                  label: "S3 Bucket",
                                  value:   (
                                    <CopyToClipboard
                                      copyButtonAriaLabel="Copy S3 Bucket"
                                      copyErrorText="Bucket failed to copy"
                                      copySuccessText="Bucket copied"
                                      textToCopy={region.s3BucketName}
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
                                      textToCopy={region.glueDatabaseName}
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
                                      textToCopy={region.qsDataSource}
                                      variant="inline"
                                    />
                                  )
                                }
                              ]}
                            />
                          </SpaceBetween>
                      }))
                  }
                />                
                )
              }

              
              </SpaceBetween>

              

            </Container>
          </>
            ) : ( // INITIALIZATION NOT RUN.
            <>
              <Container
                header={
                  <Header
                    variant="h2"
                    description="Welcome to the QuickSight Row Level Security Manager."
                  >
                    Initialization
                  </Header>
                }>
                <SpaceBetween size="l">
                  <Form

                    actions={
                      <Button 
                        iconName={loading ? undefined : "refresh"}
                        onClick={() => {
                          doAccountInit(true);
                        }}
                        variant="primary"
                        disabled={loading}>
                          {loading ? <Spinner /> : "Submit"}
                      </Button>
                    }
                    header={
                      <Header 
                        variant="h3"
                        info={
                          <Link variant="info">
                            Info
                          </Link>
                        }
                      >
                        Please, provide the following information:
                      </Header>}
                  >

                      <SpaceBetween direction="vertical" size="l">
                        <FormField 
                          label="QuickSight Management Region" 
                          constraintText="This field is required"
                          warningText={validationError}
                        >
                          <Select
                            selectedOption={qsManagementRegionSelect}
                            options={REGION_OPTIONS}
                            filteringType="auto"
                            onChange={({ detail }) => {
                              setQsManagementRegionSelect(detail.selectedOption as { value: string, label: string });
                              setValidationError("");
                            }}
                            placeholder="Choose the QuickSight management region"
                            disabled={loading}
                            empty="No regions found."
                          />
                        </FormField>
                      </SpaceBetween>
                  </Form>
                  <Steps 
                    steps={[
                      {
                        status: step_validateManagementRegion,
                        header: "Validating Management Region",
                        statusIconAriaLabel: step_validateManagementRegion
                      },
                      {
                        status: step_accountSetUp,
                        header: "Account Initialization",
                        statusIconAriaLabel: step_accountSetUp
                      },
                      {
                        status: step_qsNamespaces,
                        header: "Fetching QuickSight Namespaces",
                        statusIconAriaLabel: step_qsNamespaces
                      },
                      {
                        status: step_qsGroups,
                        header: "Fetching QuickSight Groups",
                        statusIconAriaLabel: step_qsGroups
                      },
                      {
                        status: step_qsUsers,
                        header: "Fetching QuickSight Users",
                        statusIconAriaLabel: step_qsUsers
                      },
                      {
                        status: step_initFinalizing,
                        header: "Finalizing Init",
                        statusIconAriaLabel: step_initFinalizing
                      }
                    ]}
                  />
                </SpaceBetween>
              </Container>
            </>
            )
          }
              
          <ExpandableSection 
              headerText={
                <>
                  {"Status and Logs: "}<StatusIndicator type={statusIndicator.status as StatusIndicatorProps.Type}>{statusIndicator.message}</StatusIndicator>
                </>
              } 
              variant="container">      
            <CodeView 
              content={ logs }
              lineNumbers
              wrapLines
            />
          </ExpandableSection>

        </SpaceBetween>
        )}
      </ContentLayout>
      <Modal
        visible={isEditingRegions}
        onDismiss={() => {
          setIsEditingRegions(false);
          setTempSelectedRegions(selectedRegions); // Reset temp selection
        }}
        header="Edit Managed Regions"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => {
                setIsEditingRegions(false);
              }}>
                Cancel
              </Button>
              <Button variant="primary" 
                  onClick={async () => {
                    setIsEditingRegions(false);
                    setLoadingRegions(true)
                    setLogs("")
                    for( const region of tempSelectedRegions ){
                      if( region.value ){
                        const resRegionSetup = await regionSetup({ region: region.value, addLog: addLog } )
                        if( resRegionSetup.status != 200 ){
                          addLog("Error trying to setup region: " + region.value, "ERROR")
                          // TODO - Occhio che qui se ha già creato E.g. S3 e si rompe dopo, rimane un S3 pending!!!
                          continue
                        }
                      }
                    }

                    setSelectedRegions(tempSelectedRegions);

                    addLog("===================================================================")
                    addLog("Managed Regions Setup: COMPLETED.")
                    setLoadingRegions(false)
                    
                  }}>
                Update Regions
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <FormField
            label="Select the Regions you want to manage with this tool"
            constraintText="This field is required"
          >
            <Multiselect
              selectedOptions={tempSelectedRegions}
              filteringType="auto"
              onChange={({ detail }: NonCancelableCustomEvent<MultiselectProps.MultiselectChangeDetail>) => {
                const changedOptions = detail.selectedOptions.map(option => ({
                  value: option.value,
                  label: option.label,
                  description: option.description
                }));

                // merge changedOptions and selectedRegions in a new array called newOptions, then remove duplicates
                const newOptions = [...changedOptions, ...selectedRegions].reduce<MultiselectProps.Option[]>((acc, current) => {
                  if (!acc.find(item => item.value === current.value)) {
                    acc.push(current);
                  }
                  return acc;
                }, []);

              
                setTempSelectedRegions(newOptions);
              }}
              options={
                // Map REGION_OPTIONS to extract the info needed. Then if REGION_OPTION value is in tempSelectedRegions, set the option as disabled
                REGION_OPTIONS.map((option) => {
                  const isSelected = selectedRegions.some((region) => region.value === option.value);
                  return {
                    value: option.value,
                    label: option.label,
                    description: option.description,
                    disabled: isSelected
                  };
                })
              }
              placeholder="Select Regions"
            />
          </FormField>
          <StatusIndicator type="warning">
            By clicking on Add Regions the Region Initialization will be re-launched. If new Regions have been added, the S3 Bucket, Glue Database and QuickSight DataSource for that Region will be created.
            DataSets info of all selected Regions will be fetched (or updated if a Region was already selected).
            You cannot remove a Region from this list. Please go the the specific tab if you want to remove a Region. 
          </StatusIndicator>
        </SpaceBetween>
      </Modal>
      <Modal
        visible={modalDeleteRegion}
        onDismiss={() => {
          setModalDeleteRegion(false);
        }}
        header={"Do you want to Delete " + regionToDelete + "?"}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => {
                setModalDeleteRegion(false);
              }}>
                Cancel
              </Button>
              <Button variant="primary" iconName="remove" disabled={! deletionAckChecked}
                  onClick={async () => {
                    setModalDeleteRegion(false);
                    setLogs("")
                    setLoadingRegions(true)
                    const resRegionDelete = await regionDelete({ region: regionToDelete, addLog: addLog })
                    if( resRegionDelete.status != 200 ){
                      addLog("Error trying to remove region: " + regionToDelete, "ERROR")
                      return
                    }
                    addLog("===================================================================")
                    addLog("Managed Region: " + regionToDelete + " DELETED.")
                    setLoadingRegions(false)
                    setSelectedRegions(selectedRegions.filter((region) => region.value !== regionToDelete));
                  }}>
                Remove Region
              </Button>

            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <TextContent>By confirming the deletion of <strong>Region "{regionToDelete}" </strong>from the QuickSight Managed RLS Manager you will remove all the Region-related info from the tool, but some resources might be still keeped in AWS and QuickSight.</TextContent>
          <TextContent>All the data related to DataSets, SPICE Consumption will be removed. All the links between this Tool and S3 Bucket, Glue Database and QuickSight will be removed.</TextContent>
          <TextContent>You can choose if you want to delete or keep the real resources on AWS.</TextContent>
          <TextContent><strong>NOTE: If you add the Region back in this Tool, you cannot fetch back automatically the previous resources.</strong></TextContent>
          <TextContent>You can choose if you want to delete the following resources, otherwise these resources will be kept:</TextContent>
          
          <Toggle onChange={({ detail }) => setToggleS3checked(detail.checked) } checked={toggleS3checked} >Delete S3 Bucket</Toggle>
          <Toggle onChange={({ detail }) => setToggleGluechecked(detail.checked) } checked={toggleGluechecked} >Delete Glue Database</Toggle>
          <Toggle onChange={({ detail }) => setToggleQSDatahecked(detail.checked) } checked={toggleQSDatachecked} >Delete QuickSight DataSource and RLS DataSets</Toggle>

          <Checkbox onChange={({ detail }) => setDeletionAckChecked(detail.checked) } checked={deletionAckChecked} >By checking this you enable the Deletion. The process cannot be undone.</Checkbox>
          <StatusIndicator type="warning">
            If you choose to not completely delete the resources, take notes of the resources ARNs/IDs before proceeding.
          </StatusIndicator>
          <StatusIndicator type="warning">
           INTERNAL NOTE - TODO: this will just remove the data from the DynamoDB at the moment. The full deletion part is still to be implemented. You can choose what you want in the toggles, nothing changes.
          </StatusIndicator>
        </SpaceBetween>
      </Modal>
    </>
  );
}

export default Homepage;
