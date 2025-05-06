import axios from 'axios';

// Use environment variable for API URL with fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://176.97.67.69';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false
});

// Add request interceptor for better error handling
api.interceptors.request.use(
  (config) => {
    // Log the request for debugging
    console.log('Making request to:', config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const getData = async (endpoint: string) => {
  try {
    console.log('Fetching data from:', `${API_BASE_URL}${endpoint}`);
    const response = await api.get(endpoint);
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
};

export const postData = async (endpoint: string, data: any) => {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getAmqpConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_amqp_connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        value: "39b5130b-ba84-4041-8574-2bb59dddf995"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('AMQP Connection Response:', data);
    return data;
  } catch (error) {
    console.error('Error in AMQP Connection:', error);
    throw error;
  }
};

export const prepareInformation = async (amqpData: any, formData: any) => {
  try {
    // Map country names to their corresponding numbers
    const countryNumbers: { [key: string]: number } = {
      'Russia': 170,
      // Add other country numbers as needed
    };

    // Extract AMQP connection details from the response data
    const amqpConnect = {
      "username": amqpData.data.username || '',
      "password": amqpData.data.password || '',
      "queuename": amqpData.data.queuename || ''
    };

    console.log('AMQP Connection details:', amqpConnect);

    const requestBody = {
      "amqp_connect": amqpConnect,
      "request": {
        "country": countryNumbers[formData.country] || 170,
        "identifier": formData.companyCode,
        "with_group": formData.isGroup
      },
      "token": {
        "value": "39b5130b-ba84-4041-8574-2bb59dddf995"
      }
    };

    console.log('Sending prepare information request:', requestBody);

    const response = await api.post('/prepare_information', requestBody);
    console.log('Prepare Information Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in Prepare Information:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
};

export const prepareDelcredexReport = async (amqpData: any, formData: any) => {
  try {
    // Map country names to their corresponding numbers
    const countryNumbers: { [key: string]: number } = {
      'Russia': 170,
      // Add other country numbers as needed
    };

    // Extract AMQP connection details from the response
    const amqpConnect = {
      "username": amqpData.data.username || '',
      "password": amqpData.data.password || '',
      "queuename": amqpData.data.queuename || ''
    };

    // Handle ORIGINAL CURRENCY case
    const decisionCurrency = formData.creditLimitDecisionCurrency === 'ORIGINAL CURRENCY' 
      ? 'ORIGINAL' 
      : formData.creditLimitDecisionCurrency;

    // Ensure requested_limit is a number without commas
    const requestedLimit = formData.requestedLimitAmount ? 
      formData.requestedLimitAmount.replace(/,/g, '') : 
      '0';

    // Build query parameters
    const queryParams = new URLSearchParams({
      currency_requested_limit: formData.requestedLimitCurrency || '',
      requested_limit: requestedLimit,
      language: formData.language || '',
      currency: decisionCurrency
    });

    const requestBody = {
      "amqp_connect": amqpConnect,
      "request": {
        "country": countryNumbers[formData.country] || 170,
        "identifier": formData.companyCode,
        "with_group": formData.isGroup
      },
      "token": {
        "value": "39b5130b-ba84-4041-8574-2bb59dddf995"
      }
    };

    console.log('Sending Delcredex prepare_report request:', requestBody);

    const response = await api.post(`/prepare_report?${queryParams.toString()}`, requestBody);
    console.log('Delcredex Prepare Report Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in Delcredex Prepare Report:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
};

export const getFile = async (fileUuid: string): Promise<any> => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 10000; // 10 seconds delay between retries
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retryCount + 1}/${MAX_RETRIES}: Sending Delcredex get_file request`);
      
      // Construct URL with query parameters
      const url = new URL(`${API_BASE_URL}/get_file`);
      url.searchParams.append('file_uuid', fileUuid);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/pdf'
        },
        body: JSON.stringify({
          'value': '39b5130b-ba84-4041-8574-2bb59dddf995'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if the response is a PDF
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/pdf') || response.headers.get('content-disposition')?.includes('filename=')) {
        // Create a blob from the PDF data
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return {
          status: response.status,
          body: {
            Download_file: url
          }
        };
      }

      // Try to parse as JSON
      try {
        const data = await response.json();
        console.log('File response:', data);

        if (data.Download_file) {
          return {
            status: response.status,
            body: {
              Download_file: data.Download_file
            }
          };
        }
      } catch (jsonError) {
        console.log('Response is not JSON, might be binary data');
      }

      // If no download file in response, retry
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`No download file available yet. Waiting ${RETRY_DELAY/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        retryCount++;
        continue;
      }

      throw new Error('No download file available after maximum retries');
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount === MAX_RETRIES - 1) {
        throw error;
      }
      
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw new Error('Maximum retry attempts reached without getting a valid response');
};

export default api; 