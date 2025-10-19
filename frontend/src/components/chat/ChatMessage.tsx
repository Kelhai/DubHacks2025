import type { Message } from '@/types';
import MessageContent from './MessageContent';
import './ChatMessage.css';

interface ChatMessageProps {
    message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    // Don't render if content is empty
    if (!message.content || message.content.trim() === '') {
        return null;
    }

    return (
        <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
            <div className={`chat-message-bubble ${isUser ? 'chat-message-bubble-user' : 'chat-message-bubble-assistant'}`}>
                {/* Role Badge */}
                <div className={`chat-message-badge ${isUser ? 'chat-message-badge-user' : 'chat-message-badge-assistant'}`}>
                    <span className="chat-message-emoji">
                        {isUser ? '👤' : '🤖'}
                    </span>
                    {isUser ? 'You' : 'AI Assistant'}
                </div>

                {/* Message Content */}
                <MessageContent content={message.content} isUser={isUser} />

                {/* Timestamp */}
                {message.timestamp && (
                    <div className="chat-message-timestamp">
                        <svg className="chat-message-timestamp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                )}

                {/* Paper Corner Fold Effect */}
                <div className={`chat-message-corner ${isUser ? 'chat-message-corner-user' : 'chat-message-corner-assistant'}`}></div>
            </div>
        </div>
    );
}