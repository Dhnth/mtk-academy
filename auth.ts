import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { query, getFirstRow } from "@/lib/db";
import bcrypt from "bcryptjs";

// Extend User type to include custom fields
declare module "next-auth" {
  interface User {
    role?: string;
    username?: string;
    class_id?: string | null;
  }
  interface Session {
    user: User & {
      role?: string;
      username?: string;
      class_id?: string | null;
    };
  }
}

// Type untuk row user
interface UserRow {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
  class_id: string | null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // PostgreSQL: pakai $1 untuk parameter
          const result = await query<UserRow>(
            "SELECT * FROM users WHERE username = $1",
            [credentials.username as string]
          );

          const user = getFirstRow(result);

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            class_id: user.class_id,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.class_id = user.class_id;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.class_id = token.class_id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});