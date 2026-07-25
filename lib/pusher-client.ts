import Pusher from "pusher-js";

// Hanya buat instance jika di browser environment
export const pusherClient =
  typeof window !== "undefined"
    ? new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    : (null as unknown as Pusher);