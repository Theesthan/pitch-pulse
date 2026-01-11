import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SEC EDGAR requires a valid User-Agent header
const SEC_USER_AGENT = 'PitchPulse/1.0 (contact@pitchpulse.app)'

// Input validation schema
const currentYear = new Date().getFullYear()
const requestSchema = z.object({
  runId: z.string().uuid({ message: 'runId must be a valid UUID' }),
  ticker: z.string()
    .regex(/^[A-Za-z]{1,5}$/, { message: 'ticker must be 1-5 alphabetic characters' })
    .transform(val => val.toUpperCase())
    .optional(),
  cik: z.string()
    .regex(/^\d{1,10}$/, { message: 'cik must be 1-10 numeric digits' })
    .optional(),
  fiscalYearStart: z.number()
    .int({ message: 'fiscalYearStart must be an integer' })
    .min(1990, { message: 'fiscalYearStart must be 1990 or later' })
    .max(currentYear + 1, { message: `fiscalYearStart cannot exceed ${currentYear + 1}` }),
  fiscalYearEnd: z.number()
    .int({ message: 'fiscalYearEnd must be an integer' })
    .min(1990, { message: 'fiscalYearEnd must be 1990 or later' })
    .max(currentYear + 1, { message: `fiscalYearEnd cannot exceed ${currentYear + 1}` }),
  forceRefresh: z.boolean().optional().default(false),
}).refine(
  data => data.ticker || data.cik,
  { message: 'Either ticker or cik must be provided' }
).refine(
  data => data.fiscalYearStart <= data.fiscalYearEnd,
  { message: 'fiscalYearStart must be less than or equal to fiscalYearEnd' }
).refine(
  data => (data.fiscalYearEnd - data.fiscalYearStart) <= 20,
  { message: 'Fiscal year range cannot exceed 20 years' }
)

interface SECCompanyFacts {
  cik: number
  entityName: string
  facts: {
    'us-gaap'?: Record<string, {
      label: string
      description: string
      units: Record<string, Array<{
        start?: string
        end: string
        val: number
        accn: string
        fy: number
        fp: string
        form: string
        filed: string
      }>>
    }>
  }
}

interface NormalizedFinancials {
  cik: string
  entityName: string
  ticker: string
  sicCode: string | null
  fiscalYears: FiscalYearData[]
  rawMetrics: Record<string, MetricData[]>
}

interface FiscalYearData {
  year: number
  revenue: number | null
  netIncome: number | null
  totalAssets: number | null
  totalLiabilities: number | null
  stockholdersEquity: number | null
  operatingCashFlow: number | null
  ebitda: number | null
  grossProfit: number | null
  operatingIncome: number | null
  longTermDebt: number | null
  currentAssets: number | null
  currentLiabilities: number | null
}

interface MetricData {
  end: string
  val: number
  fy: number
  form: string
  filed: string
}

// Map of common GAAP concepts to our normalized names
const METRIC_MAPPING: Record<string, keyof FiscalYearData> = {
  'Revenues': 'revenue',
  'RevenueFromContractWithCustomerExcludingAssessedTax': 'revenue',
  'SalesRevenueNet': 'revenue',
  'NetIncomeLoss': 'netIncome',
  'Assets': 'totalAssets',
  'Liabilities': 'totalLiabilities',
  'StockholdersEquity': 'stockholdersEquity',
  'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest': 'stockholdersEquity',
  'NetCashProvidedByUsedInOperatingActivities': 'operatingCashFlow',
  'GrossProfit': 'grossProfit',
  'OperatingIncomeLoss': 'operatingIncome',
  'LongTermDebt': 'longTermDebt',
  'LongTermDebtNoncurrent': 'longTermDebt',
  'AssetsCurrent': 'currentAssets',
  'LiabilitiesCurrent': 'currentLiabilities',
}

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': SEC_USER_AGENT,
          'Accept': 'application/json',
        },
      })

      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = delay * Math.pow(2, i)
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
  throw new Error('Max retries exceeded')
}

async function fetchCompanyTickers(): Promise<Record<string, { cik_str: number; ticker: string; title: string }>> {
  const response = await fetchWithRetry('https://www.sec.gov/files/company_tickers.json')
  if (!response.ok) throw new Error('Failed to fetch company tickers')
  return response.json()
}

async function getCIKFromTicker(ticker: string): Promise<{ cik: string; name: string } | null> {
  const tickers = await fetchCompanyTickers()
  
  const upperTicker = ticker.toUpperCase()
  for (const [, company] of Object.entries(tickers)) {
    if (company.ticker === upperTicker) {
      // CIK needs to be padded to 10 digits
      const paddedCIK = String(company.cik_str).padStart(10, '0')
      return { cik: paddedCIK, name: company.title }
    }
  }
  return null
}

async function fetchCompanyFacts(cik: string): Promise<SECCompanyFacts> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
  const response = await fetchWithRetry(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch company facts: ${response.status}`)
  }
  
  return response.json()
}

async function fetchCompanySubmissions(cik: string): Promise<{ sicCode: string | null }> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`
  const response = await fetchWithRetry(url)
  
  if (!response.ok) {
    return { sicCode: null }
  }
  
  const data = await response.json()
  return { sicCode: data.sic || null }
}

function normalizeFinancials(
  facts: SECCompanyFacts,
  ticker: string,
  sicCode: string | null,
  fiscalYearStart: number,
  fiscalYearEnd: number
): NormalizedFinancials {
  const usGaap = facts.facts['us-gaap'] || {}
  const rawMetrics: Record<string, MetricData[]> = {}
  const yearData: Map<number, Partial<FiscalYearData>> = new Map()

  // Initialize years
  for (let year = fiscalYearStart; year <= fiscalYearEnd; year++) {
    yearData.set(year, { year })
  }

  // Process each metric
  for (const [concept, data] of Object.entries(usGaap)) {
    const normalizedName = METRIC_MAPPING[concept]
    const units = data.units

    // Get USD values (most common for financial metrics)
    const usdValues = units['USD'] || []
    
    // Store raw metric data
    if (usdValues.length > 0) {
      rawMetrics[concept] = usdValues
        .filter(v => v.form === '10-K' && v.fy >= fiscalYearStart && v.fy <= fiscalYearEnd)
        .map(v => ({
          end: v.end,
          val: v.val,
          fy: v.fy,
          form: v.form,
          filed: v.filed,
        }))
    }

    // Map to normalized structure if we recognize this metric
    if (normalizedName) {
      for (const value of usdValues) {
        // Only use 10-K (annual) filings within our fiscal year range
        if (value.form === '10-K' && value.fy >= fiscalYearStart && value.fy <= fiscalYearEnd) {
          const existing = yearData.get(value.fy) || { year: value.fy }
          
          // Only update if we don't have a value yet (prefer first match)
          if (existing[normalizedName] === undefined) {
            existing[normalizedName] = value.val
            yearData.set(value.fy, existing)
          }
        }
      }
    }
  }

  // Convert map to sorted array
  const fiscalYears: FiscalYearData[] = Array.from(yearData.values())
    .sort((a, b) => (a.year || 0) - (b.year || 0))
    .map(data => ({
      year: data.year || 0,
      revenue: data.revenue ?? null,
      netIncome: data.netIncome ?? null,
      totalAssets: data.totalAssets ?? null,
      totalLiabilities: data.totalLiabilities ?? null,
      stockholdersEquity: data.stockholdersEquity ?? null,
      operatingCashFlow: data.operatingCashFlow ?? null,
      ebitda: null, // Calculated metric
      grossProfit: data.grossProfit ?? null,
      operatingIncome: data.operatingIncome ?? null,
      longTermDebt: data.longTermDebt ?? null,
      currentAssets: data.currentAssets ?? null,
      currentLiabilities: data.currentLiabilities ?? null,
    }))

  return {
    cik: String(facts.cik).padStart(10, '0'),
    entityName: facts.entityName,
    ticker: ticker.toUpperCase(),
    sicCode,
    fiscalYears,
    rawMetrics,
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    let requestBody: unknown
    try {
      requestBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validationResult = requestSchema.safeParse(requestBody)
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ')
      return new Response(
        JSON.stringify({ error: `Validation failed: ${errorMessages}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { runId, ticker, cik, fiscalYearStart, fiscalYearEnd, forceRefresh } = validationResult.data

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('run_data_cache')
        .select('*')
        .eq('run_id', runId)
        .eq('data_type', 'sec_financials')
        .maybeSingle()

      if (cachedData && cachedData.expires_at && new Date(cachedData.expires_at) > new Date()) {
        console.log('Returning cached SEC data')
        return new Response(
          JSON.stringify({ 
            data: cachedData.raw_data, 
            source: 'cache',
            fetchedAt: cachedData.fetched_at 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Resolve CIK from ticker if needed
    let resolvedCIK: string = cik || ''
    let companyName = ''
    
    if (!resolvedCIK && ticker) {
      const result = await getCIKFromTicker(ticker)
      if (!result) {
        return new Response(
          JSON.stringify({ error: `Ticker "${ticker}" not found in SEC database` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      resolvedCIK = result.cik
      companyName = result.name
    }

    // This should never happen due to schema validation, but TypeScript needs the check
    if (!resolvedCIK) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve CIK' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch company facts from SEC EDGAR
    console.log(`Fetching SEC data for CIK: ${resolvedCIK}`)
    const [facts, submissions] = await Promise.all([
      fetchCompanyFacts(resolvedCIK),
      fetchCompanySubmissions(resolvedCIK),
    ])

    // Normalize the financial data
    const normalizedData = normalizeFinancials(
      facts,
      ticker || '',
      submissions.sicCode,
      fiscalYearStart,
      fiscalYearEnd
    )

    // Cache the results (expires in 24 hours)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await supabase
      .from('run_data_cache')
      .upsert({
        run_id: runId,
        data_type: 'sec_financials',
        source: 'sec_edgar',
        raw_data: normalizedData,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'run_id,data_type',
      })

    // Update company with CIK and SIC code if available
    const { data: run } = await supabase
      .from('runs')
      .select('company_id')
      .eq('id', runId)
      .single()

    if (run?.company_id) {
      await supabase
        .from('companies')
        .update({
          cik: resolvedCIK,
          sic_code: submissions.sicCode,
          name: companyName || normalizedData.entityName,
        })
        .eq('id', run.company_id)
    }

    return new Response(
      JSON.stringify({ 
        data: normalizedData, 
        source: 'live',
        fetchedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Log full error details server-side only
    console.error('Error fetching SEC data:', error)
    
    // Return generic error message to client to avoid exposing internal details
    return new Response(
      JSON.stringify({ error: 'Failed to fetch SEC data. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
