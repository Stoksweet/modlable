import { z } from 'genkit/beta';
export declare const modlableChatFlow: import("genkit/beta").Action<z.ZodObject<{
    query: z.ZodString;
    pdfURLs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    query: string;
    pdfURLs?: string[] | undefined;
}, {
    query: string;
    pdfURLs?: string[] | undefined;
}>, z.ZodObject<{
    response: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
}, {
    response: string;
}>, z.ZodTypeAny>;
//# sourceMappingURL=index.d.ts.map