import type {
    UserInfoResponse,
    ChatMessagesResponse,
    SendMessageResponse
} from '@/types';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE;

// Validate that the API URL is configured
if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE environment variable is not defined. Please check your .env.local file.');
}

class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public statusText?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new ApiError(
            `API Error: ${response.statusText}`,
            response.status,
            response.statusText
        );
    }
    return response.json();
}

export const api = {
    async fetchUserInfo(): Promise<UserInfoResponse> {
        const response = await fetch(`${API_BASE_URL}user/info`);
        return handleResponse<UserInfoResponse>(response);
    },

    async fetchChatMessages(chatId: string): Promise<ChatMessagesResponse> {
        const response = await fetch(`${API_BASE_URL}chat?id=${chatId}`);
        return handleResponse<ChatMessagesResponse>(response);
    },

    async sendMessage(
        chatId: string,
        message: string
    ): Promise<SendMessageResponse> {
        const response = await fetch(`${API_BASE_URL}chat?id=${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        return handleResponse<SendMessageResponse>(response);
    },
};

export { ApiError };