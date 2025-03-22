import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "@/lib/utils";

export const resources = pgTable("resources", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  content: text("content").notNull(),
  source: varchar("source", { length: 255 }),
  title: varchar("title", { length: 255 }),
  url: varchar("url", { length: 255 }),
  author: varchar("author", { length: 255 }),
  publicationDate: timestamp("publication_date"),
  gameName: varchar("game_name", { length: 255 }),
  category: varchar("category", { length: 255 }),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for resources - used to validate API requests
export const insertResourceSchema = createSelectSchema(resources)
  .extend({
    source: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    author: z.string().optional(),
    publicationDate: z.date().optional(),
    gameName: z.string().optional(),
    category: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>;