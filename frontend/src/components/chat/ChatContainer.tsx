import MessageList from './MessageList';
import MessageInput from './MessageInput';
import type { Chat } from '@/types';
import './ChatContainer.css';

interface ChatContainerProps {
    activeChat: Chat | undefined;
    onSendMessage: (message: string) => Promise<void>;
    isSending: boolean;
}

export default function ChatContainer({
                                          activeChat,
                                          onSendMessage,
                                          isSending
                                      }: ChatContainerProps) {
    if (!activeChat) {
        return (
            <div className="chat-container-empty">
                <div className="chat-container-empty-content">
                    <h2 className="chat-container-empty-title">Welcome to Model Playground</h2>
                    <p className="chat-container-empty-text">Select a chat or create a new one to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-container-header">
                <h2 className="chat-container-header-title">
                    {activeChat.name}
                </h2>
                {activeChat.createdAt && (
                    <p className="chat-container-header-subtitle">
                        Created: {new Date(activeChat.createdAt).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Messages Area */}
            <div className="chat-container-messages">
                <MessageList
                    messages={activeChat.messages}
                    isSending={isSending}
                />
            </div>

            {/* Input Area */}
            <div className="chat-container-input">
                <MessageInput
                    onSendMessage={onSendMessage}
                    isSending={isSending}
                    disabled={!activeChat}
                />
            </div>
        </div>
    );
}