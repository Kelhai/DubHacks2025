export default function Sidebar({ chats, activeChatId, setActiveChatId }) {
  return (
    <aside className="w-64 bg-gray-200 p-4 border-r border-gray-300 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Chats</h2>
      <ul>
        {chats.map((chat) => (
          <li
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`p-2 mb-2 rounded cursor-pointer ${
              chat.id === activeChatId ? "bg-blue-300 font-bold" : "hover:bg-gray-300"
            }`}
          >
            {chat.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}

