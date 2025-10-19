import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { MESSAGE_ROLES } from '@/utils/constants';
import type { Chat, Message } from '@/types';

interface UseSendMessageReturn {
    sendMessage: (messageContent: string) => Promise<void>;
    isSending: boolean;
    error: string | null;
}

export function useSendMessage(
    activeChatId: string | null,
    updateChatMessages: (chatId: string, updateFn: (chat: Chat) => Chat) => void
): UseSendMessageReturn {
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (messageContent: string) => {
        if (!messageContent.trim() || !activeChatId || isSending) return;

        setIsSending(true);
        setError(null);

        const userMessage: Message = {
            role: MESSAGE_ROLES.USER,
            content: messageContent,
            timestamp: new Date().toISOString(),
        };

        // Optimistically add user message
        updateChatMessages(activeChatId, chat => ({
            ...chat,
            messages: [...chat.messages, userMessage],
        }));

        try {
            const data = await api.sendMessage(activeChatId, messageContent);

            const assistantMessage: Message = {
                role: MESSAGE_ROLES.ASSISTANT,
                content: data.message,
                timestamp: new Date().toISOString(),
            };

            // Add assistant response
            updateChatMessages(activeChatId, chat => ({
                ...chat,
                messages: [...chat.messages, assistantMessage],
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            setError(errorMessage);
            console.error('Failed to send message:', err);

            // Remove optimistic message on error
            updateChatMessages(activeChatId, chat => ({
                ...chat,
                messages: chat.messages.filter(m => m !== userMessage),
            }));
        } finally {
            setIsSending(false);
        }
    }, [activeChatId, isSending, updateChatMessages]);

    return { sendMessage, isSending, error };
}