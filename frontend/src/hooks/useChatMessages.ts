import { useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { Chat } from '@/types';

export function useChatMessages(
    activeChatId: string | null,
    activeChat: Chat | undefined,
    updateChatMessages: (chatId: string, updateFn: (chat: Chat) => Chat) => void
): { fetchMessages: () => Promise<void> } {
    const fetchMessages = useCallback(async () => {
        if (!activeChatId || !activeChat) return;
        if (activeChat.isMessagesCached) return;

        try {
            const data = await api.fetchChatMessages(activeChatId);

            updateChatMessages(activeChatId, chat => ({
                ...chat,
                messages: data.messages || [],
                isMessagesCached: true,
            }));
        } catch (err) {
            console.error('Failed to fetch chat messages:', err);
        }
    }, [activeChatId, activeChat, updateChatMessages]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    return { fetchMessages };
}