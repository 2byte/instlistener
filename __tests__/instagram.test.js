import { describe, it, beforeAll, expect } from "vitest";
import SeleniumEage from "../src/SeleniumEdge";
import path from "node:path";
import ActionExecutor from "../src/InstagramClient";
import { accessSync, constants, mkdirSync, writeFileSync } from "node:fs";
import * as dotenv from "dotenv";

describe("instagram selenium test", async () => {

    const loadEnv = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    if (loadEnv.error) {
        throw new Error("Failed to load .env file", { cause: loadEnv.error });
    }

    let instExec = null;

    beforeAll(async (ctx) => {
        const seleniumEdge = SeleniumEage.init(
            path.resolve(
                __dirname,
                "../drivers/edgedriver_win64/msedgedriver.exe"
            )
        );
    
        const actionExec = await ActionExecutor.init(
            await seleniumEdge.initSelenium()
        );

        await actionExec
            .setCookieStoragePath(__dirname + "/cookies")
            .useSession()
            .login(process.env.IG_LOGIN, process.env.IG_PASS);

        instExec = actionExec;
    }, 40000);

    it("Get started connection to instagram", async (ctx) => {
        expect(instExec.isAuth).toBeTruthy();
    }, 40000);

    it('Get posts by user', async () => {

        //https://instagram.com/razgar.moscow
        const posts = await instExec.getPostsByUser("razgar.moscow");

        console.log(posts);

        try {
            accessSync(__dirname + "/results", constants.W_OK)
        } catch (err) {
            if (err.code === "ENOENT") {
                mkdirSync(__dirname + "/results");
            } else {
                throw err;
            }
        }

        writeFileSync(__dirname +'/results/posts.json', JSON.stringify(posts, null, 4));

        expect(posts.length).toBeGreaterThan(0);
    }, 40000)
});
