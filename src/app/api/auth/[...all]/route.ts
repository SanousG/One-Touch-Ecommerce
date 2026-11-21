import { auth } from "@/lib/auth/auth";

const { handler } = auth;

export { handler as GET, handler as POST };
