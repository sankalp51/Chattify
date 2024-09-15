import { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../hooks/useAuth";
import useSocket from "../../hooks/useSocket";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { addMessage } from "../../redux/features/messageSlice";
import debounce from "lodash.debounce";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import ChatSkeleton from "./ChatSkeleton";
import NoMessages from "./NoMessages";
import { memo } from "react";

const ChatWindow = () => {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const userId = auth.id;

  const selectedUser = useSelector((state) => state.users.selectedUser);
  const messages = useSelector((state) => state.messages.messages);
  const status = useSelector((state) => state.messages.status);
  const { emitTyping, typingInfo, onlineUsers } = useSocket();
  const [messageInput, setMessageInput] = useState("");
  const dispatch = useDispatch();
  const chatEndRef = useRef(null);

  const emitTypingDebounced = useMemo(
    () =>
      debounce((recipientId, isTyping) => {
        emitTyping(recipientId, isTyping);
      }, 300),
    [emitTyping]
  );

  const handleSendMessage = async () => {
    if (messageInput.trim() === "") return;
    try {
      const response = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        { message: messageInput },
        { headers: { "Content-Type": "application/json" } }
      );
      dispatch(addMessage(response.data));
      setMessageInput("");
      emitTypingDebounced(selectedUser._id, false);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const memoizedMessages = useMemo(
    () =>
      messages.map((msg) => (
        <ChatBubble
          key={msg._id}
          message={msg}
          senderId={msg.sender}
          currentUserId={userId}
          selectedUser={selectedUser}
        />
      )),
    [messages, userId, selectedUser]
  );

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full">
        Select a user to start chatting.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 bg-base-100 rounded-md shadow-md">
      <div className="flex items-center mb-4 space-x-4">
        <div className="avatar">
          <div className="w-12 h-12 rounded-full">
            <img
              src={selectedUser.profilePic || "https://via.placeholder.com/150"}
              alt="Profile"
            />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{selectedUser.username}</h2>
          <p className="text-sm text-gray-500">
            {typingInfo.isTyping && typingInfo.senderId === selectedUser._id
              ? "Typing..."
              : onlineUsers.includes(selectedUser._id)
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </div>

      {status === "loading" ? (
        <div className="flex-1 overflow-y-auto mb-4">
          {[...Array(3)].map((_, index) => (
            <ChatSkeleton key={index} />
          ))}
        </div>
      ) : status === "failed" ? (
        <NoMessages />
      ) : (
        <div className="flex-1 overflow-y-auto mb-4">
          {memoizedMessages}
          <div ref={chatEndRef}></div>
        </div>
      )}

      <ChatInput
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        handleSendMessage={handleSendMessage}
        emitTyping={emitTypingDebounced}
        selectedUser={selectedUser}
      />
    </div>
  );
};

export default memo(ChatWindow);
