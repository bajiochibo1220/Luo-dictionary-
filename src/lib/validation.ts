import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["registered", "contributor", "elder", "researcher", "teacher"]),
  languageId: z.number().int().positive(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
