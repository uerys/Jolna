import { useState, useEffect, useRef } from "react";
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
  type DocumentData
} from "firebase/firestore";
import {
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: { toDate: () => Date } | null;
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const params = useParams<{ clientId?: string }>();
  const [, navigate] = useLocation();

  const isPhysio = user?.role === "physiotherapist";
  const targetClientId = params.clientId ? Number(params.clientId) : null;

  // 1. Fetch details of the counterpart in the conversation
  const physioProfile = trpc.settings.getMyProfile.useQuery(undefined, {
    enabled: !authLoading && !!user && !isPhysio
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
    }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 2. Resolve target counterpart and chat room ID
  let targetUser: { id: number; name: string | null; email: string | null; avatarUrl?: string | null; role: string } | null = null;
  let roomId = "";

  if (isPhysio && targetClientId && clientDetail.data) {
    targetUser = {
      id: clientDetail.data.id,
      name: clientDetail.data.name,
      email: clientDetail.data.email,
      avatarUrl: clientDetail.data.avatarUrl,
      role: "client"
    };
    roomId = `chat_client_${targetClientId}_physio_${user.id}`;
  } else if (!isPhysio && user?.physiotherapistId && physioProfile.data?.physiotherapist) {
    targetUser = {
      id: physioProfile.data.physiotherapist.id,
      name: physioProfile.data.physiotherapist.name,
      email: physioProfile.data.physiotherapist.email,
      avatarUrl: physioProfile.data.physiotherapist.avatarUrl,
      role: "physiotherapist"
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        msgs.push({
          id: doc.id,
          senderId: String(data.senderId),
          senderName: String(data.senderName),
          text: String(data.text),
          createdAt: data.createdAt as { toDate: () => Date } | null
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

  // 5. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    try {
      setSending(true);
      const tempText = inputText;
      setInputText("");

      await addDoc(collection(db, "chats", roomId, "messages"), {
        senderId: String(user.id),
        senderName: user.name ?? user.email ?? "User",
        text: tempText.trim(),
        createdAt: serverTimestamp()
      });

      if (targetUser) {
        await sendChat.mutateAsync({
          recipientId: targetUser.id,
          text: tempText
        });
      }
    } catch (err) {
      console.error("[Chat] Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const isLoading = authLoading || (isPhysio ? clientDetail.isLoading : physioProfile.isLoading);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-10rem)] min-h-[500px]">
        {/* Back Button */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            onClick={() => navigate(isPhysio ? `/physio/clients/${targetClientId}` : "/client/exercises")}
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
            <h3 className="text-lg font-bold text-slate-900">No designated partner found</h3>
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
                    .map((n) => n[0])
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
                  {targetUser.role === "physiotherapist" ? "Physiotherapist" : "Client"}
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
                  <p className="text-sm font-medium text-slate-800">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.senderId === String(user?.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={`rounded-2xl px-4 py-2 text-sm leading-relaxed border ${
                            isOwnMessage
                              ? "bg-[#eeffde] text-[#1a1a1a] border-[#d4f0b8] rounded-tr-none font-medium"
                              : "bg-white text-slate-800 border-slate-100 rounded-tl-none font-normal"
                          }`}
                        >
                          <p className="break-words">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground block mt-1 px-1">
                          {msg.createdAt
                            ? msg.createdAt.toDate().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "Sending..."}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2.5 bg-white">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
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
