import { createContext, useContext, useState } from 'react';

const ChatEventsContext = createContext(null);

export function ChatEventsProvider({ children }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const resetActions = () => {
    setReplyTo(null);
    setEditMessage(null);
    setContextMenu(null);
  };

  return (
    <ChatEventsContext.Provider
      value={{
        replyTo,
        setReplyTo,
        editMessage,
        setEditMessage,
        contextMenu,
        setContextMenu,
        resetActions,
      }}
    >
      {children}
    </ChatEventsContext.Provider>
  );
}

export function useChatEvents() {
  const ctx = useContext(ChatEventsContext);
  if (!ctx) {
    throw new Error('useChatEvents must be used inside ChatEventsProvider');
  }
  return ctx;
}
