export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface Chat {
    id: string;
    name: string;
    messages: Message[];
    isMessagesCached?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserInfoResponse {
    chats: Array<{
        id: string;
        name: string;
        createdAt?: string;
        updatedAt?: string;
    }>;
}

export interface ChatMessagesResponse {
    messages: Message[];
}

export interface SendMessageResponse {
    message: string;
}