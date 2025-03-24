import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

const inputSchema = z.object({
  url: z.string().url()
});

type InputType = z.infer<typeof inputSchema>;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const embeddingModel = openai.embedding("text-embedding-ada-002");

function chunkText(text: string, chunkSize = 300, overlap = 50): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);
  }

  return chunks;
}

export const embedAndChunkGuide = task({
  id: "embed-and-chunk-guide",
  run: async (payload: InputType, { ctx }) => {
    try {
      logger.info("Starting embedding and chunking for URL:", {
        url: payload.url,
      });

      // Retrieve guide content from Supabase
      const { data, error } = await supabase
        .from("game_guides")
        .select("cleaned_content")
        .eq("url", payload.url)
        .single();

      if (error) {
        logger.error("Supabase select error:", { error });
        throw error;
      }

      if (!data) {
        throw new Error("Guide content not found in Supabase.");
      }

      const guideContent = data.cleaned_content;

      // 1. Chunk the text
      const chunks = chunkText(guideContent);

      logger.info("Number of chunks:", { count: chunks.length });

      // 2. Generate embeddings and store in batches
      const batchSize = 50; // Adjust based on rate limits and testing
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        try {
          const { embeddings: generatedEmbeddings } = await embedMany({
            model: embeddingModel,
            values: batch,
          });

          // 3. Store chunks and embeddings in Supabase
          const embeddingsToStore = generatedEmbeddings.map((e, index) => ({
            url: payload.url,
            content: batch[index],
            embedding: e,
          }));

          const { error: insertError } = await supabase
            .from("guide_chunks")
            .insert(embeddingsToStore);

          if (insertError) {
            logger.error("Supabase insert error:", { error: insertError });
            throw insertError;
          }

          // Delay to avoid rate limiting (adjust as needed)
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (embedManyError) {
          logger.error("Error in embedMany() batch:", { error: embedManyError });
          throw embedManyError; // Re-throw the error
        }
      }

      logger.info("Embedding and chunking completed for URL:", {
        url: payload.url,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error embedding and chunking guide:", { error });
      throw error;
    }
  },
});