import { describe, it, beforeAll, expect } from "vitest";
import SeleniumEage from "../src/SeleniumEdge";
import SeleniumRunner from "../src/SeleniumRunner";
import path from "node:path";

describe("SeleniumRunner", () => {
    it("should run selenium with Edge", async () => {
        const seleniumEage = SeleniumEage.init(
            path.resolve(
                __dirname,
                "../drivers/edgedriver_win64/msedgedriver.exe"
            )
        );

        const seleniumRunner = SeleniumRunner.init(
            await seleniumEage.initSelenium()
        );

        await seleniumRunner.testConnection();

        await seleniumRunner.stop();
    }, 40000);
});
