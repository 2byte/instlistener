import { describe, it, beforeAll, expect, afterAll } from "vitest";
import InstagramWorker from "../src/InstagramWorker";
import dbConnection from '../src/db_connection';
import AccountManager from "../src/AccountManager";
import SeleniumRunner from "../src/SeleniumRunner";
import SeleniumEage from "../src/SeleniumEdge";
import path from "node:path";
import InstagramClient from "../src/InstagramClient";
import * as dotenv from "dotenv";

describe("InstagramWorker", () => {

    const loadEnv = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    if (loadEnv.error) {
        throw new Error("Failed to load .env file", { cause: loadEnv.error });
    }

    let db = null;
    let instWorker = null;

    beforeAll(async () => {
        db = await dbConnection;

        const accounts = [
            'razgar.moscow',
            'rm_motivator',
            'pj_murano'
        ];

        const sqlFieldValues = accounts.map((account) => {
            return `(?, ?, ?, date('now'), date('now', '+7 days'))`
        }).join(',');

        const values = accounts.map((account) => {
            return [account, 1, 1]
        }).flat();
        
        await db.run('INSERT INTO `ig_track_accounts` (`username`, `status`, `is_new`, `created_at`, `tracking_end_date`) VALUES ' + sqlFieldValues, values)
    });

    afterAll(async () => {
        //await db.run('DELETE FROM `ig_track_accounts`');
        await db.close();
        //await instWorker?.stop();
    });

    it("Get started InstagramWorker", async () => {
        const db = await dbConnection;

        const seleniumDriver = await SeleniumEage.init(path.resolve(
            __dirname,
            "../drivers/edgedriver_win64/msedgedriver.exe"
        )).initSelenium();

        const seleniumRunner = SeleniumRunner.init(
            seleniumDriver
        )

        const instagramClient = await InstagramClient
            .init(seleniumDriver)
            .setCookieStoragePath(path.resolve(__dirname, './cookies'))
            .useSession();

        await instagramClient.login(process.env.IG_LOGIN, process.env.IG_PASS);
        
        const worker = InstagramWorker.init({
            AccountManager: AccountManager.init(db),
            SeleniumRunner: seleniumRunner,
            InstagramClient: instagramClient,
            scanInterval: 1000,
            limitLoop: 2,
        });

        instWorker = worker;

        await worker.run(() => {
            console.log('Worked 1 loop')
            console.log(worker.statTickLoop)
        });

    }, 60000);
})
