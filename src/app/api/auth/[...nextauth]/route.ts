import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ADMIN_EMAIL } from "@/lib/config";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if ((user.email ?? '').trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()) {
        return true;
      }
      return false; // Deny access to anyone else
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  theme: {
    colorScheme: "light",
    logo: "/logo-zeroleakai.webp",
    brandColor: "#0066cc",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
