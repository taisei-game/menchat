import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirestoreDb } from "@/lib/firebase/firestore";
import { postInputSchema, threadInputSchema, type PostInput, type ThreadInput } from "@/lib/validation/domain";
import type { BoardPost, BoardThread } from "@/types/domain";

function toDate(value: unknown): Date | null {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate() : null;
}

export function subscribeToThreads(onChange: (threads: BoardThread[]) => void, onError: (error: Error) => void): Unsubscribe {
  const threadsQuery = query(collection(getFirestoreDb(), "boardThreads"), orderBy("updatedAt", "desc"), limit(30));

  return onSnapshot(
    threadsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((thread) => {
          const data = thread.data();
          return {
            id: thread.id,
            title: data.title as string,
            createdByUid: data.createdByUid as string,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            replyCount: (data.replyCount as number) ?? 0,
          };
        }),
      );
    },
    onError,
  );
}

export function subscribeToThread(threadId: string, onChange: (thread: BoardThread | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(getFirestoreDb(), "boardThreads", threadId), (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    const data = snapshot.data();
    onChange({
      id: snapshot.id,
      title: data.title as string,
      createdByUid: data.createdByUid as string,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      replyCount: (data.replyCount as number) ?? 0,
    });
  }, onError);
}

export async function createThread(input: ThreadInput, user: User): Promise<string> {
  const parsed = threadInputSchema.parse(input);
  const thread = await addDoc(collection(getFirestoreDb(), "boardThreads"), {
    title: parsed.title,
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    replyCount: 0,
  });
  return thread.id;
}

export function subscribeToPosts(threadId: string, onChange: (posts: BoardPost[]) => void, onError: (error: Error) => void): Unsubscribe {
  const postsQuery = query(collection(getFirestoreDb(), "boardThreads", threadId, "posts"), orderBy("number", "asc"), limit(50));

  return onSnapshot(
    postsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((post) => {
          const data = post.data();
          return {
            id: post.id,
            number: data.number as number,
            authorUid: data.authorUid as string,
            displayName: data.displayName as string,
            postMode: data.postMode as BoardPost["postMode"],
            body: data.body as string,
            createdAt: toDate(data.createdAt),
          };
        }),
      );
    },
    onError,
  );
}

export async function createPost(threadId: string, input: PostInput, user: User): Promise<string> {
  const parsed = postInputSchema.parse(input);
  const db = getFirestoreDb();
  const threadRef = doc(db, "boardThreads", threadId);
  const postRef = doc(collection(db, "boardThreads", threadId, "posts"));

  await runTransaction(db, async (transaction) => {
    const thread = await transaction.get(threadRef);

    if (!thread.exists()) {
      throw new Error("スレッドが見つかりません。");
    }

    const nextNumber = ((thread.data().replyCount as number) ?? 0) + 1;
    transaction.set(postRef, {
      number: nextNumber,
      authorUid: user.uid,
      displayName: parsed.postMode === "anonymous" ? "匿名" : user.displayName ?? "メンバー",
      postMode: parsed.postMode,
      body: parsed.body,
      createdAt: serverTimestamp(),
    });
    transaction.update(threadRef, { replyCount: nextNumber, updatedAt: serverTimestamp() });
  });
  return postRef.id;
}

export async function deletePost(threadId: string, postId: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), "boardThreads", threadId, "posts", postId));
}