import { getServerSession } from 'next-auth';
import { sessionAuthOptions as authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

function encodeSseMessage({ event, data, id }: { event?: string; data?: unknown; id?: string }) {
  const lines: string[] = [];
  if (id) {
    lines.push(`id: ${id}`);
  }
  if (event) {
    lines.push(`event: ${event}`);
  }
  if (typeof data !== 'undefined') {
    lines.push(`data: ${JSON.stringify(data)}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  const initialCursor = new Date();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let cursor = initialCursor;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        if (pollTimer) {
          clearInterval(pollTimer);
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        try {
          controller.close();
        } catch {
          // Connection is already closed.
        }
      };

      const push = (payload: { event?: string; data?: unknown; id?: string }) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(encodeSseMessage(payload)));
      };

      const poll = async () => {
        if (closed) {
          return;
        }

        try {
          const notifications = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: cursor },
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: 100,
          });

          if (notifications.length === 0) {
            return;
          }

          for (const notification of notifications) {
            push({
              event: 'notification',
              id: notification.id,
              data: notification,
            });
          }

          const latest = notifications[notifications.length - 1];
          cursor = latest.createdAt;
        } catch (error) {
          console.error('Notification stream poll failed:', {
            userId,
            error,
          });
          push({ event: 'error', data: { message: 'Midlertidig forbindelsesfejl.' } });
        }
      };

      push({
        event: 'connected',
        data: { serverTime: new Date().toISOString() },
      });

      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
      heartbeatTimer = setInterval(() => {
        push({ event: 'heartbeat', data: { at: new Date().toISOString() } });
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener('abort', close, { once: true });
    },
    cancel() {
      // Next.js handles cleanup through request abort.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
