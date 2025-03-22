import { nanoid } from '@/lib/utils';
import { index, pgTable, text, varchar, vector, serial, integer } from 'drizzle-orm/pg-core';
import { resources } from './resources';

export const embeddings = pgTable(
  'embeddings',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    resourceId: varchar('resource_id', { length: 191 }).references(
      () => resources.id,
      { onDelete: 'cascade' },
    ),
    chunkId: serial('chunk_id').notNull(),
    chunkOrder: integer('chunk_order').notNull(),
    pageNumber: integer('page_number'),
    sectionTitle: varchar('section_title', { length: 255 }),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  },
  table => ({
    embeddingIndex: index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
);