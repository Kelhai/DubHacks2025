import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { Chat } from '@/types';

interface UseChatsReturn {
    chats: Chat[];
    activeChatId: string | null;
    setActiveChatId: (id: string) => void;  // Changed from string | null to string
    activeChat: Chat | undefined;
    updateChatMessages: (chatId: string, updateFn: (chat: Chat) => Chat) => void;
    isLoading: boolean;
    error: string | null;
}

export function useChats(): UseChatsReturn {
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadChats() {
            try {
                setIsLoading(true);
                setError(null);
                const data = await api.fetchUserInfo();

                if (!isMounted) return;

                const chatsWithMessages: Chat[] = data.chats.map(chat => ({
                    ...chat,
                    messages: [],
                    isMessagesCached: false,
                }));

                setChats(chatsWithMessages);
                if (chatsWithMessages.length > 0) {
                    setActiveChatId(chatsWithMessages[0].id);
                }
            } catch (err) {
                if (isMounted) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chats';
                    setError(errorMessage);
                    console.error('Failed to fetch user info:', err);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadChats();

        return () => {
            isMounted = false;
        };
    }, []);

    const updateChatMessages = useCallback((
        chatId: string,
        updateFn: (chat: Chat) => Chat
    ) => {
        setChats(prev =>
            prev.map(chat =>
                chat.id === chatId ? updateFn(chat) : chat
            )
        );
    }, []);

    // Create a wrapper that only accepts string (not null)
    const setActiveChatIdSafe = useCallback((id: string) => {
        setActiveChatId(id);
    }, []);

    const activeChat = chats.find(c => c.id === activeChatId);

    return {
        chats,
        activeChatId,
        setActiveChatId: setActiveChatIdSafe,  // Return the safe version
        activeChat,
        updateChatMessages,
        isLoading,
        error,
    };
}