import ChatLayout from './components/layout/ChatLayout';
import { useChats } from './hooks/useChats';
import { useChatMessages } from './hooks/useChatMessages';
import { useSendMessage } from './hooks/useSendMessage';
import './App.css';

function App() {
    const {
        chats,
        activeChatId,
        setActiveChatId,
        activeChat,
        updateChatMessages,
        isLoading: isLoadingChats,
        error: chatsError,
    } = useChats();

    // Fetch messages for active chat (auto-fetches via useEffect)
    useChatMessages(
        activeChatId,
        activeChat,
        updateChatMessages
    );

    // Send message - now handles optimistic updates internally
    const { sendMessage, isSending, error: sendMessageError } = useSendMessage(
        activeChatId,
        updateChatMessages
    );

    // Check if messages are loading (not cached yet)
    const isLoadingMessages = activeChat ? !activeChat.isMessagesCached : false;

    // Handle chat selection
    const handleSelectChat = (chatId: string) => {
        setActiveChatId(chatId);
    };

    // Handle creating new chat
    const handleNewChat = async () => {
        // TODO: Implement create new chat API call
        console.log('Creating new chat...');
    };

    // Handle sending message
    const handleSendMessage = async (content: string) => {
        if (!activeChatId || !activeChat) {
            console.error('No active chat selected');
            return;
        }

        await sendMessage(content);
    };

    // Handle deleting a chat
    const handleDeleteChat = async (chatId: string) => {
        // TODO: Implement delete chat API call
        console.log('Deleting chat:', chatId);
    };

    // Show error state if there's an error loading chats
    if (chatsError) {
        return (
            <div className="app-error">
                <div className="app-error-content">
                    <div className="app-error-title">
                        Error loading chats
                    </div>
                    <p className="app-error-message">{chatsError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="app-error-button"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state while chats are being fetched
    if (isLoadingChats) {
        return (
            <div className="app-loading">
                <div className="app-loading-content">
                    <div className="app-loading-spinner"></div>
                    <p className="app-loading-text">Loading chats...</p>
                </div>
            </div>
        );
    }

    // Show send message error if there is one
    if (sendMessageError) {
        console.error('Send message error:', sendMessageError);
    }

    return (
        <div className="app-container">
            <ChatLayout
                chats={chats}
                activeChat={activeChat}
                activeChatId={activeChatId}
                isLoadingMessages={isLoadingMessages}
                isSending={isSending}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onSendMessage={handleSendMessage}
                onDeleteChat={handleDeleteChat}
            />
        </div>
    );
}

export default App;