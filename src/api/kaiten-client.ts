import axios, { AxiosInstance } from 'axios'

/**
 * Kaiten API client configuration.
 */
export interface KaitenConfig {
    apiUrl: string
    apiToken: string
}

/**
 * Creates a configured Axios instance for Kaiten API.
 */
export const createKaitenClient = (config: KaitenConfig): AxiosInstance => {
    const client = axios.create({
        baseURL: config.apiUrl,
        headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json',
        },
    })

    // Add response interceptor for error handling.
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error('Kaiten API Error:', error.response?.data || error.message)
            return Promise.reject(error)
        }
    )

    return client
}

/**
 * Default Kaiten API client instance (will be initialized with config).
 */
let kaitenClient: AxiosInstance | null = null

export const initKaitenClient = (config: KaitenConfig): void => {
    kaitenClient = createKaitenClient(config)
}

export const getKaitenClient = (): AxiosInstance => {
    if (!kaitenClient) {
        throw new Error('Kaiten client not initialized. Call initKaitenClient first.')
    }
    return kaitenClient
}

