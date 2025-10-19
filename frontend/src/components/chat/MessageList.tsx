import { useEffect, useRef } from 'react';
import Message from './Message';
import type { Message as MessageType } from '@/types';
import './MessageList.css';

interface MessageListProps {
    messages: MessageType[];
    isSending?: boolean;
}

export default function MessageList({ messages, isSending = false }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    // Filter out empty messages
    const validMessages = messages.filter(msg => msg.content && msg.content.trim() !== '');

    if (!validMessages || validMessages.length === 0) {
        return (
            <div className="message-list-empty">
                <div className="message-list-empty-content">
                    <p className="message-list-empty-title">No messages yet</p>
                    <p className="message-list-empty-subtitle">Start a conversation below</p>
                </div>
            </div>
        );
    }

    return (
        <div className="message-list">
            {validMessages.map((message, index) => (
                <Message
                    key={`${message.role}-${index}-${message.timestamp || Date.now()}`}
                    message={message}
                />
            ))}
            {isSending && (
                <div className="message-list-loading">
                    <div className="message-list-loading-avatar">
                        <span className="message-list-loading-avatar-text">AI</span>
                    </div>
                    <div className="message-list-loading-bubble">
                        <div className="message-list-loading-dots">
                            <div className="message-list-loading-dot" style={{ animationDelay: '0ms' }}></div>
                            <div className="message-list-loading-dot" style={{ animationDelay: '150ms' }}></div>
                            <div className="message-list-loading-dot" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}