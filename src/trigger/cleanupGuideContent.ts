import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";


const inputSchema = z.object({
  guideContent: z.string(),
  url: z.string(),
});

type InputType = z.infer<typeof inputSchema>;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const cleanupGuideContent = task({
  id: "cleanup-guide-content",
  run: async (payload: InputType, { ctx }) => {
    try {
      logger.info("Starting cleanup of guide content.");

      let cleanedContent = payload.guideContent;

      // Remove author information
      cleanedContent = cleanedContent.replace(/Author: .+/, "");

      // Remove legal stuff
      cleanedContent = cleanedContent.replace(/Copyright .+/, "");

      // Remove flourish
      cleanedContent = cleanedContent.replace(/={3,}/g, ""); // Remove lines of ===

      logger.info("Cleanup completed.");

      // update guide content in supabase
      const { data, error } = await supabase
        .from("game_guides")
        .update({ cleaned_content: cleanedContent })
        .eq("url", payload.url);

      if (error) {
        throw error;
      }

      return { cleanedContent, url: payload.url };
    } catch (error) {
      logger.error("Error cleaning up guide content:", { error });
      throw error;
    }
  },
});