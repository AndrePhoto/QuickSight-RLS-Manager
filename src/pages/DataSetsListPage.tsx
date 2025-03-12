import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Badge, Box, BreadcrumbGroup, Button, ButtonDropdown, Container, ContentLayout, CopyToClipboard, Header, Link, PropertyFilter, 
  SpaceBetween, StatusIndicator, Table, TextContent, Pagination, 
  ExpandableSection,
  StatusIndicatorProps,
  Modal,
  Checkbox,
  FormField,
  Steps} from "@cloudscape-design/components";
import { useHelpPanel } from "../contexts/HelpPanelContext";
import { useBreadCrumb } from "../contexts/BreadCrumbContext";
import { PropertyFilterQuery } from "@cloudscape-design/collection-hooks";
import { CodeView } from "@cloudscape-design/code-view";

import { deleteSingleDataSet } from "../hooks/deleteSingleDataSet";
import { StepStatus } from "../hooks/STEP_STATUS";

import { generateCSVOutput } from "../hooks/generateCSVOutput"

// import { enumOperators, stringOperators } from '../components/commons/property-filter-operators'

const client = generateClient<Schema>();

const rlsStatus = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED'
} as const;

const pageSize = 10

function DatasetListPage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();
  const { setBreadCrumbContent } = useBreadCrumb();

  const [originalDatasets, setOriginalDatasets] = useState<any[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<any[]>([]);
  const [filteredDatasetNumber, setFilteredDatasetNumber] = useState<number>(0);

  const [queryFilterConditions, setQueryFilterConditions] = useState<any[]>([])

  const [maxUpdatedAt, setMaxUpdatedAt] = useState<string>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)

  const [query, setQuery] = useState<PropertyFilterQuery>({
    tokens: [],
    operation: "and"
  });

  // Pagination
  const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);

  const [statusIndicator, setStatusIndicator] = useState<{status: string, message: string}>({status: "success", message: "ok"})
  const [logs, setLogs] = useState<string>("")
  const [errorsCount, setErrorsCount] = useState<number>(0)
  const [warningsCount, setWarningsCount] = useState<number>(0)

  const [modalDelete, setModalDelete] = useState<boolean>(false)
  const [s3BucketName, setS3BucketName] = useState<string>("")
  const [glueDatabaseName, setGlueDatabaseName] = useState<string>("")

  const [keepS3Check, setKeepS3Check] = useState<boolean>(false)
  const [keepPermissionsCheck, setKeepPermissionsCheck] = useState<boolean>(false)
  const [dataSetIdToDelete, setDataSetIdToDelete] = useState<string>("")
  const [managedRegion, setManagedRegion] = useState<string>("")
  const [ackDelete, setAckDelete] = useState<boolean>(false)

  const [step0_del_validating, set_step0_del_validating] = useState<StepStatus>(StepStatus.STOPPED)
  const [step1_del_fetchingDatasets, set_step1_del_fetchingDatasets] = useState<StepStatus>(StepStatus.STOPPED)
  const [step2_del_removingRLS, set_step2_del_removingRLS] = useState<StepStatus>(StepStatus.STOPPED)
  const [step3_del_deletingRLSDataSet, set_step3_del_deletingRLSDataSet] = useState<StepStatus>(StepStatus.STOPPED)
  const [step4_del_updatingRLSManager, set_step4_del_updatingRLSManager] = useState<StepStatus>(StepStatus.STOPPED)
  const [step5_del_deletingGlueTable, set_step5_del_deletingGlueTable] = useState<StepStatus>(StepStatus.STOPPED)
  const [step6_del_removingS3Files, set_step6_del_removingS3Files] = useState<StepStatus>(StepStatus.STOPPED)

  const [accountId, setAccountID] = useState<string>("")

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

  const setStep = (step: string, stepStatus: StepStatus) => {

    if( stepStatus === StepStatus.ERROR ){
      setStatusIndicator({status: "error", message: "Error Deleting DataSet"})
    }

    switch (step) {
      case "step0":
        set_step0_del_validating(stepStatus)
        break;
      case "step1":
        set_step1_del_fetchingDatasets(stepStatus)
        break;
      case "step2":
        set_step2_del_removingRLS(stepStatus)
        break;
      case "step3":
        set_step3_del_deletingRLSDataSet(stepStatus)
        break;
      case "step4":
        set_step4_del_updatingRLSManager(stepStatus)
        break;
      case "step5":
        set_step5_del_deletingGlueTable(stepStatus)
        break;
      case "step6":
        set_step6_del_removingS3Files(stepStatus)
        break;
      default:
        break;
    }
  };

  const downloadCSV = async (glueS3Id: string, region: string) => {

    const dataSetArn = `arn:aws:quicksight:${region}:${accountId}:dataset/${glueS3Id}` 

    const csvOutput = await generateCSVOutput(dataSetArn)

    const element = document.createElement("a");
    const file = new Blob([csvOutput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "RLS-for-dataset-" + glueS3Id + ".csv";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

  }

  const resetStatus = () => {
    setLogs("")
    setStep("step0", StepStatus.STOPPED)
    setStep("step1", StepStatus.STOPPED)
    setStep("step2", StepStatus.STOPPED)
    setStep("step3", StepStatus.STOPPED)
    setStep("step4", StepStatus.STOPPED)
    setStep("step5", StepStatus.STOPPED)
    setStep("step6", StepStatus.STOPPED)
  }

  useEffect(() => { // QUERY -> Create new Filters

    setIsLoading(true)

    //console.log("UseEffect: on QUERY change -> create filters")
    // Build the filter object
    const filterConditions: any[] = []

    // Add filters if needed
    if(query && query.tokens){
      let region: string[] = []
      let name: string[] = []
      let datasetId: string[] = []
      let rlsEnabled = ""
      let apiManageable = null 
      let toolCreated = null

      for (const token of query.tokens) {
        // Type assertion approach
        const typedToken = token as { propertyKey: string; value: string; operator: string }
        
        if (typedToken.propertyKey && typedToken.value) {
          switch(typedToken.propertyKey){
            case 'region':
              region.push(typedToken.value)
              break
            case 'rlsEnabled':
              rlsEnabled = typedToken.value === 'ENABLED' ? rlsStatus.ENABLED : rlsStatus.DISABLED
              break
            case 'apiManageable':
              apiManageable = typedToken.value === 'Yes' ? true : false
              break
            case 'toolCreated':
              toolCreated = typedToken.value === 'Yes' ? true : false
              break
            case 'datasetname':
              name.push(typedToken.value)
              break
            case 'datasetid':
              datasetId.push(typedToken.value)
              break
          }

          // Add other conditions as needed
        }
      }

      // Handle arrays (OR conditions)
      if (region.length > 0) {
        filterConditions.push({
          or: region.map(r => ({ dataSetRegion: { eq: r } }))
        })
      }
      if (name.length > 0) {
        filterConditions.push({
          or: name.map(n => ({ name: { eq: n } }))
        })
      }
      if (datasetId.length > 0) {
        filterConditions.push({
          or: datasetId.map(id => ({ dataSetId: { eq: id } }))
        })
      }

      // Handle single values (AND conditions)
      if (rlsEnabled) {
        filterConditions.push({
          rlsEnabled: { eq: rlsEnabled }
        })
      }
      if (apiManageable !== null) {
        filterConditions.push({
          apiManageable: { eq: apiManageable }
        })
      }
      if (toolCreated !== null) {
        filterConditions.push({
          toolCreated: { eq: toolCreated }
        })
      }

    }
    setQueryFilterConditions(filterConditions)
    setCurrentPageIndex(1)
  }, [query])


  useEffect(() => { // queryFilterConditions -> Apply Filters
    //console.log("UseEffect: on queryFilterConditions change -> create filters")
    
    const filterDataSets = async () => {
      const datasetData = await fetchDatasets(queryFilterConditions);
      if(! datasetData.firstPage && ! datasetData.fullList ){
        console.error("No datasets found");
      }
      
      setFilteredDatasets(datasetData.firstPage || []);
    }

    const fetchDatasetsFiltered = async () => {

      const token = pageTokens[currentPageIndex - 1]

      const { data: dataSetList, errors } = await client.models.DataSet.list({
        limit: pageSize,
        nextToken: token,
        ...(queryFilterConditions.length > 0 && {
          filter:{
            [query.operation]: queryFilterConditions
          }
        })
      })

      if(!errors && dataSetList){
        setFilteredDatasets(dataSetList)
        setIsLoading(false)
      }else{
        setFilteredDatasets([])
        setIsLoading(false)
        throw new Error(`Error fetching datasets: ${errors}`);
      }
    }
    
    filterDataSets()

    fetchDatasetsFiltered()

  }, [queryFilterConditions])

  useEffect(() => {
    
    setIsLoading(true)
    const updateTablePage = async () => {
      //console.log("useEffect - currentPageIndex - updateTablePage")
      const token = pageTokens[currentPageIndex - 1]

      const { data: dataSetList, errors } = await client.models.DataSet.list({
        limit: pageSize,
        nextToken: token,
        filter:{
          [query.operation]: queryFilterConditions
        }
      })

      if(!errors && dataSetList){
        setFilteredDatasets(dataSetList)
      }else{
        setFilteredDatasets([])
        throw new Error(`Error fetching datasets: ${errors}`);
      }
    }

    //console.log("useEffect - currentPageIndex - calling updateTablePage")
    updateTablePage()
    //console.log("useEffect - currentPageIndex - finished updateTablePage")
    setIsLoading(false)
    
  }, [currentPageIndex])
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
  useEffect(() => {
    changeStatusIndicator()
  }, [errorsCount, warningsCount]);

  useEffect(() => {
    //console.log("useEffect - INITIAL")

    resetStatus()
    setStatusIndicator({status: "success", message: "ok"})

    setIsLoading(true)
    const loadDatasets = async () => {
      setIsLoading(true)
      try {
        const datasetData = await fetchDatasets([]);

        if(!datasetData.firstPage && !datasetData.fullList){
          throw new Error("No datasets found");
        }

        setOriginalDatasets(datasetData.fullList || []);
        setFilteredDatasets(datasetData.firstPage || []);

        fetchAccountDetails();

      } catch (err) {
        throw new Error(`Error fetching datasets: ${err}`);
      } finally{
        setIsLoading(false)
      }
    };
  
    loadDatasets();

    setHelpPanelContent(
      <SpaceBetween size="l">
        <Header variant="h2">DataSet List</Header>
        <Header variant="h3">RLS Column details:</Header>
        <TextContent>
          <ul>
            <li>
              <Badge color="green">ENABLED</Badge> The DataSet has RLS activated and managed by this tool.
            </li>
            <li>
            <Badge color="severity-medium">ENABLED</Badge> The DataSet has RLS activated and managed <strong>outside</strong> this tool (manually). If you start managing permission with this tool, this will override the existing RLS DataSet.
            </li>
            <li>
            <Badge color="severity-neutral">DISABLED</Badge> The RLS is disabled for this dataset.
            </li>
          </ul>
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
        <Header variant="h3">Tool Created:</Header>
        <TextContent>
          <ul>
            <li>
              <StatusIndicator type="success">Yes</StatusIndicator>: this DataSet is a RLS DataSet created using this tool.
            </li>
            <li>
            <StatusIndicator type="error">No</StatusIndicator>: this DataSet has been created directly in QuickSight, or via APIs, but not with this tool.
            </li>
          </ul>
        </TextContent>
      </SpaceBetween>
    );
    setIsHelpPanelOpen(false); 

    setBreadCrumbContent(<BreadcrumbGroup
      items={[
        { text: "QS Managed RLS Tool", href: "/" },
        { text: "Explore Data", href: "/" },
        { text: "Datasets", href: "/datasets-list" },
      ]}
    />)

    // Cleanup when component unmounts
    return () => {
      setHelpPanelContent(null);
      setBreadCrumbContent(null);
      setIsHelpPanelOpen(false);
    };
  }, [setHelpPanelContent, setBreadCrumbContent]);


  const fetchDatasets = async (filters: any[]) => {
    //console.log("fetchDatasets")
    setIsLoading(true)
    setPageTokens([])
    try {
      let token: string | null = "";
      let firstDataSetPage: any[] = [];
      let fullDataSetList: any[] = [];
      let isFirst = true;
      let tempTokens: (string | null)[] = []; // Temporary array to collect tokens
      let tempCount = 0

      do {
        const { data: dataSetList, nextToken, errors } = await client.models.DataSet.list({
          limit: pageSize,
          nextToken: token,
          ...(filters.length > 0 && {
            filter: {
              [query.operation]: filters
            }
          })
        }) as { data: any[]; nextToken: string | null; errors?: any[] };

        if( errors ){
          setFilteredDatasetNumber(0)
          console.error(errors[0].message);
          return {
            firstPage: [],
            fullList: []
          }
        }

        if( isFirst ){
          firstDataSetPage = dataSetList
          isFirst = false
          tempTokens.push("")
        }

        if(nextToken){
          token = nextToken
          tempTokens.push(nextToken);
        }else{
          token = null
        }

        tempCount += dataSetList.length

        fullDataSetList.push(...dataSetList)
      
      } while (token);

      setFilteredDatasetNumber(tempCount)
      setPageTokens([...tempTokens]);

      return {
        firstPage: firstDataSetPage,
        fullList: fullDataSetList
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
      return {
        firstPage: [],
        fullList: []
      }
    }
  };

  const fetchAccountDetails = async () => {
    setIsLoading(true)
    try {
      const response = await client.models.AccountDetails.list({
        authMode: 'userPool'
      });
      if (response.data.length > 0 && response.data[0]) { 
        setMaxUpdatedAt(response.data[0].updatedAt || "")
        setAccountID(response.data[0].accountId)
      }else{
        console.warn("Fetching Account Details: Account Details are not available. Please enter them.")
      }
    } catch (err) {
      console.error('Fetching Account Details: Error fetching Account Details:', err);
    } 
  };

  const loadDeleteModal = async (managedRegion: string, dataSetId: string) => {
    try{
      const {data: regionDetails, errors} = await client.models.ManagedRegion.get({ regionName: managedRegion })

      if(errors){
        console.error("Error fetching Managed Region details: ", errors)
        return
      }else{
        if(!regionDetails){
          console.error("Error fetching Managed Region details: No region details found")
          return
        }
        setS3BucketName(regionDetails.s3BucketName)
        setGlueDatabaseName(regionDetails.glueDatabaseName)
        setManagedRegion(regionDetails.regionName)
        setDataSetIdToDelete(dataSetId)
      }

      setModalDelete(true)

    }catch(e){
      console.error("Error fetching Managed Region details: ", e)
      return
    }
  }

  const deleteDataSet = async () => {
    resetStatus()

    deleteSingleDataSet({
      accountId: accountId,
      region: managedRegion,
      s3BucketName: s3BucketName,
      glueDatabaseName: glueDatabaseName,
      rlsDataSetArn: dataSetIdToDelete,
      keepS3: keepS3Check,
      keepPermissions: keepPermissionsCheck,
      addLog,
      setStep
    })
    setModalDelete(false)
  }

  return (
    <>
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
            description="These are the Datasets of your QuickSight Account synchronized with the tool."
          >
          Explore Data: Datasets
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container
          >
            {// SORTING-PAGING ETC: https://cloudscape.design/get-started/dev-guides/collection-hooks/
            }
            <Table
              totalItemsCount={filteredDatasetNumber}
              filter={
                <PropertyFilter
                  query={query}
                  onChange={({ detail }) => 
                    {
                      setQuery(detail)
                      //console.log(detail)
                    }
                  }
                  enableTokenGroups={false} // se cambi qui, non funziona la query (tokenGroup instead of tokens)
                  expandToViewport
                  i18nStrings={{
                    clearFiltersText: "Clear All Filters",
                    applyActionText: "Apply Filter",
                    cancelActionText: "Cancel",
                    operatorText: "Operator",
                    groupPropertiesText: "Select a Property",
                    valueText: "Value",
                    propertyText: "Property",
                    operatorsText: "operatorsText",
                    groupValuesText: "groupValuesText",
                    operationOrText: "or",
                    operationAndText: "and",
                    operatorEqualsText: "equal to",
                    operatorLessText: "less than",
                    operatorGreaterText: "greater than",
                    operatorContainsText: "contains",
                    operatorStartsWithText: "starts with",
                    operatorLessOrEqualText: "less or equal than",
                    operatorGreaterOrEqualText: "greater or equal than",
                    operatorDoesNotEqualText: "does not equal to",
                    operatorDoesNotContainText: "does not contain",
                    
                  }}
                  
                  filteringAriaLabel="Find DataSet"
                  filteringPlaceholder="Find DataSet"
                  filteringFinishedText="No other DataSet to display."
                  filteringOptions={[
                    // Create a filteringOption for all the regions in originalDataset
                    ...Array.from(new Set(originalDatasets.map((dataset: any) => dataset.dataSetRegion))).map((region: any) => ({
                      propertyKey: "region",
                      value: region
                    })) as any[],
                    ...Array.from(new Set(originalDatasets.map((dataset: any) => dataset.dataSetId))).map((datasetid: any) => ({
                      propertyKey: "datasetid",
                      value: datasetid
                    })) as any[],
                    ...Array.from(new Set(originalDatasets.map((dataset: any) => dataset.name))).map((name: any) => ({
                      propertyKey: "datasetname",
                      value: name
                    })) as any[],
                    {
                      propertyKey: "rlsEnabled",
                      value: rlsStatus.ENABLED
                    },
                    {
                      propertyKey: "rlsEnabled",
                      value: rlsStatus.DISABLED
                    },
                    {
                      propertyKey: "apiManageable",
                      value: "Yes"
                    },
                    {
                      propertyKey: "apiManageable",
                      value: "No"
                    },
                    {
                      propertyKey: "toolCreated",
                      value: "Yes"
                    },
                    {
                      propertyKey: "toolCreated",
                      value: "No"
                    }
                  ]}
                  filteringProperties={[
                    {
                      key: "region",
                      propertyLabel: "DataSet Region",
                      groupValuesLabel: "DataSet Region values"
                    },                
                    {
                      key: "datasetid",
                      propertyLabel: "DataSet ID",
                      groupValuesLabel: "DataSet ID values"
                    },
                    {
                      key: "datasetname",
                      propertyLabel: "DataSet Name",
                      groupValuesLabel: "DataSet Name values"
                    },
                    {
                      key: "rlsEnabled",
                      propertyLabel: "RLS Enabled",
                      groupValuesLabel: "DataSet RLS values"
                    },
                    {
                      key: "apiManageable",
                      propertyLabel: "API Manageable",
                      groupValuesLabel: "API Manageable values"
                    },
                    {
                      key: "toolCreated",
                      propertyLabel: "Created with RLS Tool",
                      groupValuesLabel: "Created with RLS Tool values"
                    },
                  ]}
                />}
              loadingText="Loading QuickSight DataSets"
              loading={isLoading}
              stripedRows
              wrapLines
              variant="embedded"
              header={
                <Header
                variant="h2"
                description={`Last Update: ${maxUpdatedAt || ''}`}
                counter={"(" + filteredDatasetNumber + ")"}
                actions={
                  <SpaceBetween
                  direction="horizontal"
                  size="xs"
                  >
                    <ButtonDropdown
                      items={[
                        {
                          text: "Refresh Datasets",
                          id: "rm",
                          disabled: true
                        },
                      ]}
                    >
                      Actions
                    </ButtonDropdown>
                  </SpaceBetween>
                }
              >
                Datasets List
              </Header>
              }
              empty={ ! isLoading && (
                <Box
                  margin={{ vertical: "xs" }}
                  textAlign="center"
                  color="inherit"
                >
                  <TextContent>
                    <p><strong>No Datasets Found.</strong></p>
                    <p>Please check that you have Datasets in QuickSight.</p>
                    <p>If you think you should see Datasets here, go to <Link href="/">Homepage</Link> to launch <strong>resources update</strong>.</p>
                  </TextContent>
                </Box>
              )}
              columnDefinitions={[
                {
                  id: "Name",
                  header: "Name",
                  cell: (item: any) => (
                    <>
                      { ( item.toolCreated || ! item.apiManageable ) ? item.name : 
                        <Link href={`/manage-permissions?dataSetId=${item.dataSetId}&region=${item.dataSetRegion}`}>{item.name}</Link>
                      }
                    </>
                  ),
                  maxWidth: 300
                },
                {
                  id: "dataSetId",
                  header: "ID",
                  cell: (item: any) => (
                    <CopyToClipboard
                      copyButtonText="Copy DataSet ID"
                      textToCopy={item.dataSetId} 
                      copySuccessText={""} 
                      copyErrorText={""}
                      variant="inline"
                    />
                  ),
                  maxWidth: 300
                },
                {
                  id: "region",
                  header: "Region",
                  cell: (item: any) => item.dataSetRegion,
                  minWidth: 120
                },
                {
                  id: "rlsEnabled",
                  header: "RLS",
                  cell: (item: any) => (
                    <>
                      {item.toolCreated ? <StatusIndicator type="stopped">RLS DataSet</StatusIndicator> : 
                        <>
                          <Badge color={item.rlsEnabled === "ENABLED" 
                            ? (item.rlsToolManaged === true 
                                ? "green" 
                                : "severity-medium")
                            : "severity-neutral"}>
                            {item.rlsEnabled}
                          </Badge>
                          {item.rlsEnabled === "ENABLED" && 
                            <CopyToClipboard textToCopy={item.rlsDataSetId} 
                              copyButtonText="Copy RLS DataSet ARN" 
                              copySuccessText={"Copied RLS DataSet ARN"} 
                              copyErrorText={"Failed to copy RLS DataSet ARN"} 
                              variant="icon"
                            />
                          }
                        </>
                      }
                    </>
                  ),
                },
                {
                  id: "rlsDataSetId",
                  header: "RLS DataSet",
                  cell: (item: any) => (
                    <CopyToClipboard
                      copyButtonText="Copy RLS DataSet ID"
                      textToCopy={item.rlsDataSetId} 
                      copySuccessText={""} 
                      copyErrorText={""}          
                      variant="inline"
                    />
                  ),
                },
                {
                  id: "APIManageable",
                  header: "Manageable",
                  cell: (item: any) => (
                    <StatusIndicator type={item.toolCreated ? "stopped" : (item.apiManageable ? undefined : "error")}>
                      {item.toolCreated ? "" : (item.apiManageable ? "Yes" : "No")}
                    </StatusIndicator>
                  ),
                  maxWidth: 80
                },
                {
                  id: "ToolCreated",
                  header: "Tool Created",
                  cell: (item: any) => (
                    <StatusIndicator type={item.toolCreated ? undefined : "error"}>
                      {item.toolCreated ? "Yes" : "No"}
                    </StatusIndicator>
                  ),
                  maxWidth: 80
                },
                {
                  id: "RLSToolManaged",
                  header: "RLS Tool Managed",
                  cell: (item: any) => (
                    <StatusIndicator type={item.rlsToolManaged ? undefined : "error"}>
                      {item.rlsToolManaged ? "Yes" : "No"}
                    </StatusIndicator>
                  ),
                },
                {
                  id: "ARN",
                  header: "ARN",
                  cell: (item: any) => item.dataSetArn,
                },
                {
                  id: "glueS3Id",
                  header: "glueS3Id",
                  cell: (item: any) => item.glueS3Id,
                },
                {
                  id: "delete",
                  header: "Actions",
                  cell: item => {
                    if( item.toolCreated ){
                    
                      return (
                        <>
                        <ButtonDropdown
                          variant="icon"
                          onItemClick={(action) => {
                            if (action.detail.id === "rm") {
                              loadDeleteModal(item.dataSetRegion, item.dataSetId)
                            }
                            if (action.detail.id === "csv") {
                              downloadCSV(item.glueS3Id, item.dataSetRegion)
                            }
                          }}
                          items={[
                            {
                              text: "Delete DataSet",
                              id: "rm",
                            },
                            {
                              text: "Download Permissions CSV",
                              id: "csv",
                            },
                          ]}
                        />
                      {/*<Button
                        variant="inline-icon"
                        ariaLabel={`Delete DataSet ${item.dataSetId}`}
                        //disabled={true}
                        //disabledReason="You can Remove only DataSets created by RLS Manager."
                        onClick={() => {
                          loadDeleteModal(item.dataSetRegion, item.dataSetId)
                        }}
                        iconName="remove"
                        
                      >}
                      </Button>*/}
                      </>
                      )
                    }else{
                      return null
                    }
                  },
                  minWidth: 100
                }
              ]}
              columnDisplay={[
                { id: "Name", visible: true },
                { id: "dataSetId", visible: true },
                { id: "region", visible: true },
                { id: "rlsEnabled", visible: true },
                { id: "rlsDataSetId", visible: false },
                { id: "APIManageable", visible: true },
                { id: "ToolCreated", visible: false },
                { id: "ARN", visible: false },
                { id: "RLSToolManaged", visible: false },
                { id: "delete", visible: true },
                { id: "glueS3Id", visible: false }
              ]}
              items={filteredDatasets}
              pagination={
                <Pagination
                  currentPageIndex={currentPageIndex}
                  pagesCount={Math.ceil(filteredDatasetNumber / pageSize)}
                  onChange={({ detail }) => { setCurrentPageIndex(detail.currentPageIndex) } }
                  onNextPageClick={() => { setCurrentPageIndex( currentPageIndex + 1 ) } }
                  onPreviousPageClick={() => { setCurrentPageIndex( currentPageIndex - 1 ) } }
                />
              }
            />
          </Container>
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
                      status: step0_del_validating,
                      header: "Validating RLS Tool Resources",
                      statusIconAriaLabel: step0_del_validating
                    },
                    {
                      status: step1_del_fetchingDatasets,
                      header: "Checking DataSets with RLS enabled",
                      statusIconAriaLabel: step1_del_fetchingDatasets
                    },
                    {
                      status: step2_del_removingRLS,
                      header: "Removing RLS from DataSets with selected RLS DataSet",
                      statusIconAriaLabel: step2_del_removingRLS
                    },
                    {
                      status: step3_del_deletingRLSDataSet,
                      header: "Deleting RLS DataSet from QuickSight",
                      statusIconAriaLabel: step3_del_deletingRLSDataSet
                    },
                    {
                      status: step4_del_updatingRLSManager,
                      header: "Updating RLS Manager",
                      statusIconAriaLabel: step4_del_updatingRLSManager
                    },
                    {
                      status: step5_del_deletingGlueTable,
                      header: "Deleting Glue Table",
                      statusIconAriaLabel: step5_del_deletingGlueTable
                    },
                    {
                      status: step6_del_removingS3Files,
                      header: "Deleting S3 Files",
                      statusIconAriaLabel: step6_del_removingS3Files
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
          visible={modalDelete}
          onDismiss={() => {
            setModalDelete(false)
          }}
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={
                    () => {
                      setModalDelete(false)
                    }
                  }>Cancel</Button>
                <Button variant="primary" disabled={! ackDelete} onClick={
                    () => {
                      deleteDataSet()
                    }
                  }>Delete DataSet</Button>
              </SpaceBetween>
            </Box>
          }
          header="Delete DataSet"
        >
          <SpaceBetween size="l">
            <TextContent>
              <p>By proceeding you will remove the RLS from <strong>all</strong> the QuickSight DataSets that have this RLS DataSet.</p>
            </TextContent>
            <FormField
              label="CSV Files">
              <TextContent>
                <p>You can decide to keep the CSV files created in the S3 bucket: <i><CopyToClipboard variant="inline" textToCopy={s3BucketName} copySuccessText={"S3 path copied."} copyErrorText={"Failed to copy the S3 path."}></CopyToClipboard></i></p>
              </TextContent>
              <Checkbox checked={keepS3Check} onChange={({ detail }) => setKeepS3Check(detail.checked)}>
                Keep the S3 Files
              </Checkbox>
            </FormField>
            <FormField
              label="RLS Manager Permissions">
              <TextContent>
                <p>You can decide to keep Permissions saved in the RLS Manager. If you then want to re-create the RLS, go to Manage Permissions page and click on Puslish.</p>
              </TextContent>
              <Checkbox checked={keepPermissionsCheck} onChange={({ detail }) => setKeepPermissionsCheck(detail.checked)}>
                Keep the Permissions
              </Checkbox>
            </FormField>
            <FormField
              label="Warning">
              <Checkbox checked={ackDelete} onChange={({ detail }) => setAckDelete(detail.checked)}>
                <StatusIndicator type="warning">Deleting the RLS DataSet is an irreversible action. By clicking here you acknowledge it.</StatusIndicator>
              </Checkbox>
              </FormField>
          </SpaceBetween>

        </Modal>
      </ContentLayout>
    </>
  );
}

export default DatasetListPage;