import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatContainer from '../chat/ChatContainer';
import DocumentViewer from '../documents/DocumentViewer';
import type { Chat } from '@/types';
import { documentsApi } from '@/services/documents';
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

type View = 'chat' | 'documents';

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
    const [activeView, setActiveView] = useState<View>('chat');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const result = await documentsApi.uploadDocument(file);
            if (result.success) {
                console.log('Upload successful:', result.document);
                // TODO: Refresh document list
            } else {
                console.error('Upload failed:', result.error);
                alert(`Upload failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="chat-layout">
            <Sidebar
                chats={chats}
                activeChatId={activeChatId}
                onChatSelect={onSelectChat}
                onNewChat={onNewChat}
                onDeleteChat={onDeleteChat}
            />

            <div className="chat-layout-main">
                {/* View Switcher */}
                <div className="view-switcher">
                    <button
                        className={`view-switcher-button ${activeView === 'chat' ? 'view-switcher-button-active' : ''}`}
                        onClick={() => setActiveView('chat')}
                    >
                        <ChatIcon />
                        <span>Chat</span>
                    </button>
                    <button
                        className={`view-switcher-button ${activeView === 'documents' ? 'view-switcher-button-active' : ''}`}
                        onClick={() => setActiveView('documents')}
                    >
                        <DocumentIcon />
                        <span>Documents</span>
                    </button>
                </div>

                {/* Content */}
                <div className="chat-layout-content">
                    {activeView === 'chat' ? (
                        <ChatContainer
                            activeChat={activeChat}
                            onSendMessage={onSendMessage}
                            isSending={isSending || isLoadingMessages}
                        />
                    ) : (
                        <DocumentViewer
                            onUpload={handleUpload}
                            isUploading={isUploading}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Icons
function ChatIcon() {
    return (
        <svg className="view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
    );
}

function DocumentIcon() {
    return (
        <svg className="view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
}