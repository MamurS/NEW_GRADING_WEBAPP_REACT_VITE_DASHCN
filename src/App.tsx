import { useState } from 'react'
import { Button } from './components/ui/button'
import { getAmqpConnection, prepareInformation, prepareDelcredexReport, getFile } from './lib/api'
import { FormData, COUNTRIES, CURRENCIES, LANGUAGES } from './types/form'

function App() {
  const [formData, setFormData] = useState<FormData>({
    companyCode: '',
    country: 'Russia',
    isGroup: false,
    requestedLimitCurrency: 'EUR',
    requestedLimitAmount: '',
    creditLimitDecisionCurrency: 'ORIGINAL',
    language: 'English'
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [companyCodeError, setCompanyCodeError] = useState<string | null>(null)
  const [downloadLink, setDownloadLink] = useState<string | null>(null)
  const [isPreparingFile, setIsPreparingFile] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)

  const formatNumber = (value: string) => {
    // Remove all non-digit and non-decimal characters
    const digits = value.replace(/[^\d.]/g, '')
    
    // Split into integer and decimal parts
    const parts = digits.split('.')
    const integerPart = parts[0]
    const decimalPart = parts[1] ? `.${parts[1]}` : ''
    
    // Format integer part with thousand separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    
    return formattedInteger + decimalPart
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (name === 'requestedLimitAmount') {
      // Check if there are any non-digit characters (excluding commas and decimal points)
      const hasInvalidChars = /[^\d,.]/.test(value)
      
      // Check if there's more than one decimal point
      const hasMultipleDecimals = (value.match(/\./g) || []).length > 1
      
      // Only show warning if there are invalid characters
      setAmountError(hasInvalidChars ? 'Please enter only digits' : null)
      
      // Format the number with commas if it's valid
      if (!hasInvalidChars && !hasMultipleDecimals) {
        const formattedValue = formatNumber(value)
        setFormData(prev => ({
          ...prev,
          [name]: formattedValue
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }))
      }
    } else if (name === 'companyCode') {
      // Validate company code
      const isValid = /^\d*$/.test(value)
      setCompanyCodeError(!isValid ? 'Please enter only digits' : null)
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }))
    }
  }

  const handleCancel = () => {
    setIsCancelled(true)
    setLoading(false)
    setIsPreparingFile(false)
    setError(null)
    setDownloadLink(null)
    setIsPreparingFile(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCancelled(false)
    try {
      setLoading(true)
      setError(null)

      // First step: Get AMQP Connection
      if (isCancelled) return
      const amqpResponse = await getAmqpConnection()
      if (isCancelled) return
      console.log('AMQP Connection established:', amqpResponse)

      // Second step: Prepare DIM Information using the AMQP connection details
      if (isCancelled) return
      let dimResponse = await prepareInformation(amqpResponse, formData)
      if (isCancelled) return
      console.log('DIM Information prepared:', dimResponse)

      // Check if we need to renew AMQP connection
      if (dimResponse.status === false) {
        if (isCancelled) return
        console.log('DIM Prepare Information status is false, renewing AMQP connection...')
        // Renew AMQP connection
        const newAmqpResponse = await getAmqpConnection()
        if (isCancelled) return
        console.log('New AMQP Connection established:', newAmqpResponse)

        // Retry DIM Prepare Information with new AMQP credentials
        dimResponse = await prepareInformation(newAmqpResponse, formData)
        if (isCancelled) return
        console.log('DIM Information prepared with new AMQP credentials:', dimResponse)
      }

      // Third step: Prepare Delcredex Report
      if (isCancelled) return
      const delcredexReport = await prepareDelcredexReport(amqpResponse, formData)
      if (isCancelled) return
      console.log('Delcredex Report prepared:', delcredexReport)

      // Fourth step: Get file after 1 minute
      if (delcredexReport.status === true && delcredexReport.data?.file_uuid) {
        setIsPreparingFile(true)
        // Wait for 1 minute before requesting the file
        await new Promise(resolve => setTimeout(resolve, 60000))
        if (isCancelled) return
        const fileResponse = await getFile(delcredexReport.data.file_uuid)
        if (isCancelled) return
        if (fileResponse.body.Download_file) {
          setDownloadLink(fileResponse.body.Download_file)
        }
        setIsPreparingFile(false)
      }

    } catch (err) {
      if (!isCancelled) {
        console.error('Submit error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      setIsPreparingFile(false)
    } finally {
      if (!isCancelled) {
        setLoading(false)
      }
    }
  }

  const getDecisionCurrencyOptions = () => {
    if (!formData.requestedLimitCurrency) return ['ORIGINAL', ...CURRENCIES]
    return ['ORIGINAL', ...CURRENCIES.filter(c => c !== formData.requestedLimitCurrency)]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-8 py-10">
            <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
              CREDIT RATINGS & LIMITS
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {/* Company Code and Group */}
                <div className="flex items-end gap-4">
                  <div className="w-72">
                    <label htmlFor="companyCode" className="block text-lg font-bold text-gray-700 mb-2">
                      COMPANY CODE
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="companyCode"
                        id="companyCode"
                        value={formData.companyCode}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4 text-right"
                      />
                      {companyCodeError && (
                        <div className="absolute right-0 top-full mt-1 text-sm text-red-600">
                          {companyCodeError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-24 flex flex-col items-center">
                    <label htmlFor="isGroup" className="block text-lg font-bold text-gray-700 mb-2 text-center">
                      GROUP
                    </label>
                    <div className="flex items-center justify-center h-12">
                      <input
                        type="checkbox"
                        name="isGroup"
                        id="isGroup"
                        checked={formData.isGroup}
                        onChange={handleInputChange}
                        className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Country */}
                <div className="flex justify-end">
                  <div className="w-[28rem]">
                    <label htmlFor="country" className="block text-lg font-bold text-gray-700 mb-2">
                      COUNTRY
                    </label>
                    <select
                      name="country"
                      id="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4"
                    >
                      <option value="">Select a country</option>
                      {COUNTRIES.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Requested Credit Limit Amount and Currency */}
                <div className="col-span-2 grid grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="requestedLimitCurrency" className="block text-lg font-bold text-gray-700 mb-2">
                      REQUESTED LIMIT CURRENCY
                    </label>
                    <div className="w-72">
                      <select
                        name="requestedLimitCurrency"
                        id="requestedLimitCurrency"
                        value={formData.requestedLimitCurrency}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4"
                      >
                        <option value="">Select currency</option>
                        {CURRENCIES.map(currency => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-[28rem]">
                      <label htmlFor="requestedLimitAmount" className="block text-lg font-bold text-gray-700 mb-2">
                        REQUESTED LIMIT AMOUNT
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="requestedLimitAmount"
                        id="requestedLimitAmount"
                        value={formData.requestedLimitAmount}
                        onChange={handleInputChange}
                        placeholder="Enter amount (e.g. 1,000,000)"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4 text-right"
                      />
                      {amountError && (
                        <div className="absolute right-0 top-full mt-1 text-sm text-red-600">
                          {amountError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Credit Limit Decision Currency and Language */}
                <div className="col-span-2 grid grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="creditLimitDecisionCurrency" className="block text-lg font-bold text-gray-700 mb-2">
                      LIMIT DECISION CURRENCY
                    </label>
                    <div className="w-72">
                      <select
                        name="creditLimitDecisionCurrency"
                        id="creditLimitDecisionCurrency"
                        value={formData.creditLimitDecisionCurrency}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4"
                      >
                        {getDecisionCurrencyOptions().map(currency => (
                          <option key={currency} value={currency}>
                            {currency === 'ORIGINAL' ? 'ORIGINAL CURRENCY' : currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-[28rem]">
                      <label htmlFor="language" className="block text-lg font-bold text-gray-700 mb-2">
                        LANGUAGE
                      </label>
                      <select
                        name="language"
                        id="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-md shadow-gray-200 focus:border-blue-500 focus:ring-blue-500 text-lg h-12 px-4"
                      >
                        <option value="">Select a language</option>
                        {LANGUAGES.map(language => (
                          <option key={language} value={language}>{language}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button type="submit" disabled={loading || isPreparingFile}>
                  {loading || isPreparingFile ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      {isPreparingFile ? 'Preparing Report...' : 'Processing...'}
                    </div>
                  ) : (
                    'Submit'
                  )}
                </Button>
                {(loading || isPreparingFile) && (
                  <Button
                    type="button"
                    onClick={handleCancel}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {isPreparingFile && (
                <p className="mt-4 text-center text-xl font-medium text-blue-600">
                  Please wait, download link will appear here...
                </p>
              )}

              {downloadLink && (
                <div className="mt-4 text-center">
                  <a
                    href={downloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    Download Report
                  </a>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 