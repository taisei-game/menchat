import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { messageInputSchema, type MessageInput } from "@/lib/validation/domain";
import type { TalkMessage } from "@/types/domain";

const roomId = "general";
const messageCollection = () => collection(getFirestoreDb(), "talkRooms", roomId, "messages");

function toDate(value: unknown): Date | null {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate() : null;
}

export function subscribeToTalkMessages(onChange: (messages: TalkMessage[]) => void, onError: (error: Error) => void): Unsubscribe {
  const messagesQuery = query(messageCollection(), orderBy("createdAt", "desc"), limit(50));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((message) => {
          const data = message.data();
          return {
            id: message.id,
            authorUid: data.authorUid as string,
            displayName: data.displayName as string,
            postMode: data.postMode as TalkMessage["postMode"],
            body: data.body as string,
            createdAt: toDate(data.createdAt),
          };
        }),
      );
    },
    onError,
  );
}

export async function createTalkMessage(input: MessageInput, user: User): Promise<string> {
  const parsed = messageInputSchema.parse(input);

  const message = await addDoc(messageCollection(), {
    authorUid: user.uid,
    displayName: parsed.postMode === "anonymous" ? "匿名" : user.displayName ?? "メンバー",
    postMode: parsed.postMode,
    body: parsed.body,
    createdAt: serverTimestamp(),
  });
  return message.id;
}

export async function deleteTalkMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), "talkRooms", roomId, "messages", messageId));
}