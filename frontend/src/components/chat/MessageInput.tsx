import { useState, KeyboardEvent, ChangeEvent, useRef, useEffect } from 'react';
import './MessageInput.css';

interface MessageInputProps {
    onSendMessage: (message: string) => Promise<void>;
    isSending: boolean;
    disabled?: boolean;
}

export default function MessageInput({
                                         onSendMessage,
                                         isSending,
                                         disabled = false
                                     }: MessageInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = async () => {
        if (input.trim() && !isSending && !disabled) {
            await onSendMessage(input);
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const isDisabled = isSending || disabled;

    return (
        <div className="message-input-container">
            <div className="message-input-wrapper">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isDisabled ? "Please wait..." : "Type your message... (Shift+Enter for new line)"}
                    disabled={isDisabled}
                    rows={1}
                    className={`message-input-textarea ${isDisabled ? 'message-input-textarea-disabled' : ''}`}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isDisabled}
                    className={`message-input-button ${(!input.trim() || isDisabled) ? 'message-input-button-disabled' : ''}`}
                >
                    {isSending ? (
                        <div className="message-input-spinner" />
                    ) : (
                        <SendIcon />
                    )}
                </button>
            </div>
            <p className="message-input-hint">
                Press Enter to send, Shift+Enter for new line
            </p>
        </div>
    );
}

// Simple Send Icon component (replaces PaperAirplaneIcon)
function SendIcon() {
    return (
        <svg
            className="message-input-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
        </svg>
    );
}