import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url(),
});

type InputType = z.infer<typeof inputSchema>;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        .select("content")
        .eq("url", payload.url)
        .single();

      if (error) {
        logger.error("Supabase select error:", { error });
        throw error;
      }

      if (!data) {
        throw new Error("Guide content not found in Supabase.");
      }

      const guideContent = data.content;

      // Implement embedding and chunking logic here
      // ...

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