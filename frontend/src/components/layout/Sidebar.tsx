import type { Chat } from '@/types';
import './Sidebar.css';

interface SidebarProps {
    chats: Chat[];
    activeChatId: string | null;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => Promise<void>;
    onDeleteChat: (chatId: string) => Promise<void>;
}

export default function Sidebar({
                                    chats,
                                    activeChatId,
                                    onChatSelect,
                                    onNewChat,
                                    onDeleteChat
                                }: SidebarProps) {
    const getLastMessage = (chat: Chat) => {
        if (!chat.messages || chat.messages.length === 0) return null;
        return chat.messages[chat.messages.length - 1];
    };

    const getTimeAgo = (timestamp?: string) => {
        if (!timestamp) return '';
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / 60000);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const handleDelete = (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this chat?')) {
            onDeleteChat(chatId);
        }
    };

    return (
        <aside className="sidebar">
            {/* Header */}
            <header className="sidebar-header">
                <div className="sidebar-header-top">
                    <h2 className="sidebar-title">Lessons</h2>
                    <button
                        className="sidebar-new-chat-btn"
                        title="New chat"
                        onClick={onNewChat}
                    >
                        <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* Search bar */}
                <div className="sidebar-search">
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="sidebar-search-input"
                    />
                    <svg
                        className="sidebar-search-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </header>

            {/* Chat List */}
            <nav className="sidebar-chat-list">
                {chats.length === 0 ? (
                    <div className="sidebar-empty">
                        <div className="sidebar-empty-icon-wrapper">
                            <svg className="sidebar-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="sidebar-empty-title">No conversations yet</p>
                        <p className="sidebar-empty-subtitle">
                            Start a new chat to begin learning
                        </p>
                    </div>
                ) : (
                    <ul className="sidebar-chat-items">
                        {chats.map((chat) => {
                            const lastMessage = getLastMessage(chat);
                            const isActive = chat.id === activeChatId;

                            return (
                                <li key={chat.id} className="sidebar-chat-item">
                                    <button
                                        onClick={() => onChatSelect(chat.id)}
                                        className={`sidebar-chat-button ${isActive ? 'sidebar-chat-button-active' : ''}`}
                                    >
                                        <div className="sidebar-chat-content">
                                            {/* Avatar */}
                                            <div className={`sidebar-chat-avatar ${isActive ? 'sidebar-chat-avatar-active' : ''}`}>
                                                {chat.name?.[0]?.toUpperCase() || '?'}
                                            </div>

                                            {/* Content */}
                                            <div className="sidebar-chat-info">
                                                <div className="sidebar-chat-header">
                                                    <h3 className={`sidebar-chat-name ${isActive ? 'sidebar-chat-name-active' : ''}`}>
                                                        {chat.name}
                                                    </h3>
                                                    {lastMessage?.timestamp && (
                                                        <span className="sidebar-chat-time">
                                                            {getTimeAgo(lastMessage.timestamp)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Last message preview */}
                                                {lastMessage ? (
                                                    <p className="sidebar-chat-preview">
                                                        {lastMessage.role === 'user' ? (
                                                            <span className="sidebar-chat-preview-user">You:</span>
                                                        ) : (
                                                            <span className="sidebar-chat-preview-ai">AI:</span>
                                                        )}
                                                        <span className="sidebar-chat-preview-text">{lastMessage.content}</span>
                                                    </p>
                                                ) : (
                                                    <p className="sidebar-chat-no-messages">
                                                        No messages yet
                                                    </p>
                                                )}

                                                {/* Message count badge */}
                                                {chat.messages && chat.messages.length > 0 && (
                                                    <div className="sidebar-chat-meta">
                                                        <span className="sidebar-chat-count">
                                                            {chat.messages.length} messages
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Active indicator */}
                                            {isActive && (
                                                <div className="sidebar-chat-indicator">
                                                    <div className="sidebar-chat-indicator-dot"></div>
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* Delete button */}
                                    <button
                                        className="sidebar-chat-delete"
                                        onClick={(e) => handleDelete(e, chat.id)}
                                        title="Delete chat"
                                    >
                                        <svg className="sidebar-chat-delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </nav>

            {/* Footer */}
            <footer className="sidebar-footer">
                <div className="sidebar-footer-content">
                    <div className="sidebar-footer-avatar">
                        U
                    </div>
                    <div className="sidebar-footer-info">
                        <p className="sidebar-footer-name">Your Profile</p>
                        <p className="sidebar-footer-status">Online</p>
                    </div>
                    <button
                        className="sidebar-footer-settings"
                        title="Settings"
                    >
                        <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </footer>
        </aside>
    );
}