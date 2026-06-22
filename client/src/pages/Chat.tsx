import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import {
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  User,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: { toDate: () => Date } | null;
  editedAt?: { toDate: () => Date } | null;
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const params = useParams<{ clientId?: string }>();
  const [, navigate] = useLocation();

  const isPhysio = user?.role === "physiotherapist";
  const targetClientId = params.clientId ? Number(params.clientId) : null;

  // 1. Fetch details of the counterpart in the conversation
  const physioProfile = trpc.settings.getMyProfile.useQuery(undefined, {
    enabled: !authLoading && !!user && !isPhysio,
  });

  const clientDetail = trpc.physio.getClientDetail.useQuery(
    { clientId: targetClientId ?? 0 },
    { enabled: !authLoading && isPhysio && targetClientId !== null }
  );

  const utils = trpc.useUtils();
  const sendChat = trpc.notifications.sendChat.useMutation();
  const markChatRead = trpc.notifications.markChatRead.useMutation({
    onSuccess: () => {
      void utils.notifications.unreadCount.invalidate();
      void utils.notifications.listMine.invalidate();
    },
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 2. Resolve target counterpart and chat room ID
  let targetUser: {
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    role: string;
  } | null = null;
  let roomId = "";

  if (isPhysio && targetClientId && clientDetail.data) {
    targetUser = {
      id: clientDetail.data.id,
      name: clientDetail.data.name,
      email: clientDetail.data.email,
      avatarUrl: clientDetail.data.avatarUrl,
      role: "client",
    };
    roomId = `chat_client_${targetClientId}_physio_${user.id}`;
  } else if (
    !isPhysio &&
    user?.physiotherapistId &&
    physioProfile.data?.physiotherapist
  ) {
    targetUser = {
      id: physioProfile.data.physiotherapist.id,
      name: physioProfile.data.physiotherapist.name,
      email: physioProfile.data.physiotherapist.email,
      avatarUrl: physioProfile.data.physiotherapist.avatarUrl,
      role: "physiotherapist",
    };
    roomId = `chat_client_${user.id}_physio_${user.physiotherapistId}`;
  }

  // 3. Set up real-time listener to Firestore messages
  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as DocumentData;
        msgs.push({
          id: doc.id,
          senderId: String(data.senderId),
          senderName: String(data.senderName),
          text: String(data.text),
          createdAt: data.createdAt as { toDate: () => Date } | null,
          editedAt: data.editedAt as { toDate: () => Date } | null | undefined,
        });
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [roomId]);

  // 4. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (targetUser?.id) {
      markChatRead.mutate({ senderId: targetUser.id });
    }
  }, [targetUser?.id, messages.length]);

  // 5. Send or Edit message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    try {
      setSending(true);
      const tempText = inputText;
      setInputText("");

      if (editingMessageId) {
        await updateDoc(
          doc(db, "chats", roomId, "messages", editingMessageId),
          {
            text: tempText.trim(),
            editedAt: serverTimestamp(),
          }
        );
        setEditingMessageId(null);
      } else {
        await addDoc(collection(db, "chats", roomId, "messages"), {
          senderId: String(user.id),
          senderName: user.name ?? user.email ?? "User",
          text: tempText.trim(),
          createdAt: serverTimestamp(),
        });

        if (targetUser) {
          await sendChat.mutateAsync({
            recipientId: targetUser.id,
            text: tempText,
          });
        }
      }
    } catch (err) {
      console.error("[Chat] Failed to send/edit message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = (msgId: string, text: string) => {
    setEditingMessageId(msgId);
    setInputText(text);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!roomId) return;
    if (!window.confirm("Are you sure you want to delete this message?"))
      return;

    try {
      await deleteDoc(doc(db, "chats", roomId, "messages", msgId));
    } catch (err) {
      console.error("[Chat] Failed to delete message:", err);
    }
  };
  const renderedMessages = useMemo(() => {
    const elements: React.ReactNode[] = [];
    let lastDateStr = "";

    messages.forEach(msg => {
      if (msg.createdAt) {
        const msgDate = msg.createdAt.toDate();
        const formattedDate = msgDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        });
        if (formattedDate !== lastDateStr) {
          lastDateStr = formattedDate;
          elements.push(
            <div
              key={`date_${msg.id}`}
              className="flex justify-center my-4 select-none"
            >
              <span className="bg-slate-800/10 text-slate-500 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                {formattedDate}
              </span>
            </div>
          );
        }
      }

      const isOwnMessage = msg.senderId === String(user?.id);
      elements.push(
        <div
          key={msg.id}
          className={`flex items-center gap-2 group relative mb-2 ${
            isOwnMessage ? "justify-end" : "justify-start"
          }`}
        >
          {isOwnMessage && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mr-1 select-none shrink-0">
              <button
                type="button"
                onClick={() => handleEditMessage(msg.id, msg.text)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                title="Edit message"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(msg.id)}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete message"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          )}

          <div className="max-w-[75%]">
            {/* Bubble Content */}
            <div
              className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed border relative ${
                isOwnMessage
                  ? "bg-[#eeffde] text-[#1a1a1a] border-[#d4f0b8] rounded-br-none font-medium mr-[7px]"
                  : "bg-white text-slate-800 border-slate-100 rounded-bl-none font-normal ml-[7px]"
              }`}
            >
              <div className="break-words">
                <span>{msg.text}</span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] select-none float-right mt-1.5 ml-2 ${
                    isOwnMessage ? "text-[#8a997d]" : "text-muted-foreground"
                  }`}
                >
                  {msg.editedAt && (
                    <span className="text-[8px] opacity-75 mr-1 font-normal">
                      edited
                    </span>
                  )}
                  <span>
                    {msg.createdAt
                      ? msg.createdAt.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Sending..."}
                  </span>
                </span>
                <div className="clear-both" />
              </div>

              {/* Telegram Custom Bubble Tail */}
              {isOwnMessage ? (
                <svg
                  className="absolute bottom-0 -right-[6px] w-[9px] h-[16px] text-[#eeffde] fill-current"
                  viewBox="0 0 9 16"
                >
                  <path d="M0 16h9V0C9 0 7.5 12 0 16z" />
                </svg>
              ) : (
                <svg
                  className="absolute bottom-0 -left-[6px] w-[9px] h-[16px] text-white fill-current filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.02)]"
                  viewBox="0 0 9 16"
                >
                  <path d="M9 16H0V0C0 0 1.5 12 9 16z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      );
    });

    return elements;
  }, [messages, user?.id, editingMessageId]);
  const isLoading =
    authLoading ||
    (isPhysio ? clientDetail.isLoading : physioProfile.isLoading);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)] min-h-[500px]">
        {/* Back Button */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            onClick={() =>
              navigate(
                isPhysio
                  ? `/physio/clients/${targetClientId}`
                  : "/client/exercises"
              )
            }
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-[#534AB7] hover:bg-indigo-50/50 transition-colors"
          >
            <ArrowLeft className="size-4 mr-1" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Realtime Chat
          </span>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Loader2 className="size-8 text-[#534AB7] animate-spin mb-2" />
            <p className="text-sm text-slate-500">Loading conversation...</p>
          </div>
        ) : !targetUser ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No designated partner found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              {isPhysio
                ? "Could not locate this client's profile."
                : "You don't have a designated physiotherapist assigned yet. Please contact your administrator."}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Conversation Header */}
            <div className="border-b px-6 py-4 flex items-center gap-3 bg-slate-50/50">
              <Avatar className="h-10 w-10 border border-slate-200 shadow-sm flex items-center justify-center bg-indigo-50 text-indigo-700 rounded-full">
                <AvatarImage src={targetUser.avatarUrl ?? undefined} />
                <AvatarFallback className="font-bold text-sm bg-indigo-50 text-indigo-700">
                  {targetUser.name
                    ?.split(" ")
                    .map(n => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-none mb-1">
                  {targetUser.name ?? targetUser.email}
                </h3>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {targetUser.role === "physiotherapist"
                    ? "Physiotherapist"
                    : "Client"}
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#e7ebf0]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 rounded-full bg-slate-50 text-slate-400 mb-2">
                    <MessageSquare className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    No messages yet
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Send a message to start the conversation.
                  </p>
                </div>
              ) : (
                renderedMessages
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            {editingMessageId && (
              <div className="px-6 py-2 bg-slate-50 border-t flex justify-between items-center text-xs text-slate-500 select-none">
                <span className="flex items-center gap-1.5 font-medium">
                  <Pencil className="size-3 text-[#534AB7]" />
                  Editing message
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessageId(null);
                    setInputText("");
                  }}
                  className="text-[#534AB7] hover:underline flex items-center gap-0.5"
                >
                  <X className="size-3" />
                  Cancel
                </button>
              </div>
            )}
            <form
              onSubmit={handleSendMessage}
              className="border-t p-4 flex gap-2.5 bg-white"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={sending}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-400 transition focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-60"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white rounded-xl shadow-sm px-4 py-2.5 flex items-center justify-center size-10"
              >
                <Send className="size-4 shrink-0 text-white" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
