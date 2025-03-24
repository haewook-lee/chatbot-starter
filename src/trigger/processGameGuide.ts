import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
// Import data extraction and embedding tasks
import { extractGameGuide } from "./extractGameGuide";
import { embedAndChunkGuide } from "./embedAndChunkGuide";
import { cleanupGuideContent } from "./cleanupGuideContent";

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

export const processGameGuide = task({
  id: "process-game-guide",
  run: async (payload: InputType, { ctx }) => {
    try {
      logger.info("Starting processing for URL:", { url: payload.url });

      // 1. Determine data source and run appropriate task
      // For now, we'll only handle GameFAQs URLs.
      if (payload.url.includes("gamefaqs.gamespot.com")) {
        // const extractionResult = await extractGameGuide.triggerAndWait({
        //   url: payload.url,
        // });

        // if (!extractionResult.ok) {
        //   throw extractionResult.error;
        // }

        // logger.info("Extraction result:", { extractionResult });

        // if (extractionResult.output.exists) {
        //   logger.info("Guide already exists, skipping embedding.");
        //   return { url: payload.url, exists: true };
        // }

        // 2. Run cleanup task
        // retrieve guide content from supabase
        const { data, error } = await supabase
          .from("game_guides")
          .select("content")
          .eq("url", payload.url)
          .single();

        if (error) {
          throw error;
        }

        const guideContent = data.content;

        const cleanedContent = await cleanupGuideContent.triggerAndWait({
          guideContent: guideContent,
          url: payload.url,
        });

        if (!cleanedContent.ok) {
          throw cleanedContent.error;
        }

        // 3. Run embedding/chunking task
        const embeddingResult = await embedAndChunkGuide.triggerAndWait({
          url: payload.url
        });

        if (!embeddingResult.ok) {
          throw embeddingResult.error;
        }

        return { url: payload.url, success: embeddingResult.output.success };
      } else {
        // Handle other data sources here (e.g., local files, other websites)
        throw new Error("Unsupported data source.");
      }
    } catch (error) {
      logger.error("Error processing game guide:", { error });
      throw error;
    }
  },
});