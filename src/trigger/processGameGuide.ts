import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
// Import data extraction and embedding tasks
import { extractGameGuide } from "./extractGameGuide";
import { embedAndChunkGuide } from "./embedAndChunkGuide";

const inputSchema = z.object({
  url: z.string().url(),
});

type InputType = z.infer<typeof inputSchema>;

export const processGameGuide = task({
  id: "process-game-guide",
  run: async (payload: InputType, { ctx }) => {
    try {
      logger.info("Starting processing for URL:", { url: payload.url });

      // 1. Determine data source and run appropriate task
      // For now, we'll only handle GameFAQs URLs.
      if (payload.url.includes("gamefaqs.gamespot.com")) {
        const extractionResult = await extractGameGuide.triggerAndWait({
          url: payload.url,
        });

        if (!extractionResult.ok) {
          throw extractionResult.error;
        }

        logger.info("Extraction result:", { extractionResult });

        if (extractionResult.output.exists) {
          logger.info("Guide already exists, skipping embedding.");
          return { url: payload.url, exists: true };
        }

        // 2. Run embedding/chunking task
        const embeddingResult = await embedAndChunkGuide.triggerAndWait({
          url: payload.url,
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