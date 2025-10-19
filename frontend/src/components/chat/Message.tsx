import { MESSAGE_ROLES } from '@/utils/constants';
import type { Message as MessageType } from '@/types';
import MessageContent from './MessageContent';
import './Message.css';

interface MessageProps {
    message: MessageType;
}

export default function Message({ message }: MessageProps) {
    const isUser = message.role === MESSAGE_ROLES.USER;

    // Don't render if content is empty
    if (!message.content || message.content.trim() === '') {
        return null;
    }

    return (
        <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
            {/* Avatar */}
            <div className="message-avatar-wrapper">
                <div className={`message-avatar ${isUser ? 'message-avatar-user' : 'message-avatar-assistant'}`}>
                    {isUser ? '👤' : '🤖'}
                </div>
            </div>

            {/* Message Bubble */}
            <div className={`message-bubble-wrapper ${isUser ? 'message-bubble-wrapper-user' : 'message-bubble-wrapper-assistant'}`}>
                {/* Name */}
                <div className={`message-name ${isUser ? 'message-name-user' : 'message-name-assistant'}`}>
                    {isUser ? 'You' : 'AI Assistant'}
                </div>

                {/* Bubble */}
                <div className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}>
                    <MessageContent content={message.content} isUser={isUser} />
                </div>

                {/* Timestamp */}
                {message.timestamp && (
                    <div className="message-timestamp">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}