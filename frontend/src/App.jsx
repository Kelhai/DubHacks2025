import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [activeChatId, setActiveChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [input, setInput] = useState("");
  const chatsRef = useRef([]);

  // keep ref in sync
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // fetch chat list once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}user/info`);
        const data = await res.json();
        const chatsWithMessages = data.chats.map(chat => ({ ...chat, messages: [] }));
        setChats(chatsWithMessages);
        chatsRef.current = chatsWithMessages;
        if (chatsWithMessages.length > 0) setActiveChatId(chatsWithMessages[0].id);
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    })();
  }, []);

  // fetch messages for a chat if not cached
  const fetchMessages = useCallback(async (chatId) => {
    const currentChats = chatsRef.current;
    const chat = currentChats.find(c => c.id === chatId);
    if (!chat || (chat.messages && chat.messages.length > 0)) return; // already cached

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}chat?id=${chatId}`);
      const data = await res.json();

      setChats(prev =>
        prev.map(c =>
          c.id === chatId ? { ...c, messages: data.messages || [] } : c
        )
      );
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    }
  }, []);

  // fetch messages whenever chat is switched
  useEffect(() => {
    if (activeChatId) fetchMessages(activeChatId);
  }, [activeChatId, fetchMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;

    setChats(prev => {
      // create a new array and new chat object to avoid mutation
      return prev.map(c => 
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, { role: "user", content: input }] }
          : c
      );
    });
    setInput("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}chat?id=${activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();

      // append assistant response
      setChats(prev =>
        prev.map(c =>
          c.id === activeChatId
            ? { ...c, messages: [...c.messages, { role: "assistant", content: data.message }] }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId) || { messages: [] };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
      />

      <div className="flex-1 flex flex-col bg-amber-50">
        <div className="flex-1 overflow-y-auto p-4">
          {activeChat.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 p-2 rounded max-w-xs ${
                msg.role === "user"
                  ? "bg-blue-200 self-end"
                  : "bg-gray-200 self-start"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex">
          <input
            type="text"
            className="flex-1 p-2 border rounded mr-2"
            placeholder="Ask a math question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

