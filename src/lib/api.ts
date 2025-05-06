import axios from 'axios';

export const API_BASE_URL = 'https://176.97.67.69';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Browser-compatible SSL handling
  withCredentials: false,
  httpsAgent: {
    rejectUnauthorized: false
  }
});

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
    const response = await api.post('/get_amqp_connection', {
      value: "39b5130b-ba84-4041-8574-2bb59dddf995"
    });

    console.log('AMQP Connection Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in AMQP Connection:', error);
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
      
      const response = await axios.post(
        `${API_BASE_URL}/get_file`,
        {
          'value': '39b5130b-ba84-4041-8574-2bb59dddf995'
        },
        {
          params: {
            'file_uuid': fileUuid
          },
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer' // This will handle binary data
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if we received binary data with PDF headers
      if (response.headers['content-type'] === 'application/octet-stream' || 
          response.headers['content-disposition']?.includes('filename=')) {
        // Create a blob from the binary data
        const blob = new Blob([response.data], { type: 'application/pdf' });
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        console.log('Successfully created PDF blob URL');
        return {
          status: response.status,
          headers: response.headers,
          body: { Download_file: url }
        };
      }

      // If no binary data, try to parse as JSON
      try {
        const textDecoder = new TextDecoder('utf-8');
        const jsonResponse = JSON.parse(textDecoder.decode(response.data));
        console.log('Delcredex Get File Response:', jsonResponse);
        
        if (jsonResponse.Download_file) {
          return {
            status: response.status,
            headers: response.headers,
            body: jsonResponse
          };
        }
      } catch (e) {
        console.log('Response is not JSON, waiting for binary data...');
      }

      // Only retry if we didn't get any binary data or JSON with download link
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`No binary data or download link available yet. Waiting ${RETRY_DELAY/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }

      retryCount++;
    } catch (error) {
      console.error('Error in Delcredex Get File:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
        if (retryCount === MAX_RETRIES - 1) {
          throw error;
        }
      }
      console.log(`Error occurred. Waiting ${RETRY_DELAY/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      retryCount++;
    }
  }

  throw new Error('Maximum retry attempts reached without getting a valid response');
};

export default api; 