import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url(),
});

type InputType = z.infer<typeof inputSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const extractGameGuide = task({
  id: "extract-game-guide",
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: InputType, { ctx }) => {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(payload.url, { waitUntil: "networkidle2", timeout: 60000 });

      await page.waitForSelector('pre[id^="faqspan-"]', { timeout: 60000 });

      const preTags = await page.$$('pre[id^="faqspan-"]');

      let guideContent = "";

      for (const preTag of preTags) {
        const text = await page.evaluate((el) => el.innerText, preTag);
        guideContent += text + "\n";
      }

      await browser.close();

      // Insert data into Supabase
      const { data, error } = await supabase.from("game_guides").insert([
        {
          url: payload.url,
          content: guideContent,
        },
      ]);

      if (error) {
        logger.error("Supabase insert error:", { error });
        throw error;
      }

      logger.info("Game guide stored in Supabase", {
        supabaseData: data,
        length: guideContent.length,
      });

      return { supabaseData: data };
    } catch (error) {
      logger.error("Error extracting game guide", { error });
      throw error;
    }
  },
});