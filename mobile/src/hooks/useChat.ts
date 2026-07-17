import { useEffect, useState } from 'react';
import { sendMessage, subscribeToMessages } from '../lib/chat';
import type { Message } from '../types/models';

export function useChat(matchId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToMessages(matchId, setMessages);
  }, [matchId]);

  async function send(text: string) {
    if (!matchId || !text.trim()) return;
    await sendMessage(matchId, text.trim());
  }

  return { messages, send };
}
