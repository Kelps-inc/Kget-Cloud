import { Injectable } from "@nestjs/common";

@Injectable()
export class ExtractTextUseCase {
  async execute(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === "application/pdf") {
      return this.extractPdf(buffer);
    }
    if (mimeType === "text/html") {
      return this.extractHtml(buffer);
    }
    // XML, CSV, TXT — plain text
    return buffer.toString("utf-8");
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text as string;
  }

  private extractHtml(buffer: Buffer): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { load } = require("cheerio");
    const $ = load(buffer.toString("utf-8"));
    $("script, style, noscript, nav, footer, header").remove();
    return $("body").text().replace(/\s+/g, " ").trim();
  }
}
