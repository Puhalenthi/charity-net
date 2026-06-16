import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

if (!getApps().length) initializeApp();
const db = getFirestore();

export const onMessageCreated = onDocumentCreated(
  'threads/{threadId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data() as { fromUid?: string; text?: string };
    const threadRef = db.collection('threads').doc(event.params.threadId);
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) return;
    const thread = threadSnap.data() as { participants: string[] };
    const otherUid = thread.participants.find((p) => p !== message.fromUid);

    const update: Record<string, unknown> = {
      lastMessage: {
        text: message.text ?? '',
        fromUid: message.fromUid ?? '',
        createdAt: Date.now(),
      },
    };
    if (otherUid) {
      update[`unread.${otherUid}`] = FieldValue.increment(1);
    }
    await threadRef.update(update);

    if (otherUid) {
      const notifRef = db
        .collection('notifications')
        .doc(otherUid)
        .collection('entries')
        .doc();
      await notifRef.set({
        id: notifRef.id,
        type: 'new_message',
        title: 'New message',
        body: (message.text ?? '').slice(0, 200),
        threadId: event.params.threadId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
