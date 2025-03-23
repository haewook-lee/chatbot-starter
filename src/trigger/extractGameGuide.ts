import { logger, task } from "@trigger.dev/sdk/v3";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import axios from "axios";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url(),
});

type InputType = z.infer<typeof inputSchema>;

export const extractGameGuide = task({
  id: "extract-game-guide",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: InputType, { ctx }) => {
    try {
      const response = await axios.get(payload.url);
      const guideContent = response.data;

      logger.log("Game guide content", { guideContent });

      // const result = await generateObject({
      //   model: openai("gpt-4-turbo"),
      //   system: `You are a helpful assistant that knows a lot about video games and what a user might want to know about it if they're playing it.
      //   You will be given a url of a game guide and you will need to extract the game guide from the url.
      //   You will need to return a json object that is ready for data chunking and embedding.

      //   Ignore any information regarding the author of the guide, the date of the guide, or any other information that is not relevant to the game guide.
      //   `,
      // prompt: `Extract the game guide from the following url: ${payload.url}`,
      // schema: z.object({
      //   gameGuide: z.string(),
      // }),
      // });

      // logger.log("Game guide extracted", { result });

      // return result;
    } catch (error) {
      logger.error("Error extracting game guide", { error });
      throw error;
    }
  },
});
