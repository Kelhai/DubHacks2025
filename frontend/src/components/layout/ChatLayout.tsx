import Sidebar from './Sidebar';
import ChatContainer from '../chat/ChatContainer';
import type { Chat } from '@/types';
import './ChatLayout.css';

interface ChatLayoutProps {
    chats: Chat[];
    activeChat: Chat | undefined;
    activeChatId: string | null;
    isLoadingMessages: boolean;
    isSending: boolean;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => Promise<void>;
    onSendMessage: (content: string) => Promise<void>;
    onDeleteChat: (chatId: string) => Promise<void>;
}

export default function ChatLayout({
                                       chats,
                                       activeChat,
                                       activeChatId,
                                       isLoadingMessages,
                                       isSending,
                                       onSelectChat,
                                       onNewChat,
                                       onSendMessage,
                                       onDeleteChat,
                                   }: ChatLayoutProps) {
    return (
        <div className="chat-layout">
            <Sidebar
                chats={chats}
                activeChatId={activeChatId}
                onChatSelect={onSelectChat}
                onNewChat={onNewChat}
                onDeleteChat={onDeleteChat}
            />
            <ChatContainer
                activeChat={activeChat}
                onSendMessage={onSendMessage}
                isSending={isSending}
            />
        </div>
    );
}