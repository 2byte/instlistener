/**
 * Start the worker
 */

import InstagramWorker from "./src/InstagramWorker.js";
import AccountManager from "./src/AccountManager.js";
import SeleniumRunner from "./src/SeleniumRunner.js";
import SeleniumEage from "./src/SeleniumEdge.js";
import InstagramClient from "./src/InstagramClient.js";
import * as dotenv from "dotenv";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";

dotenv.config();

const pathToDatabase = path.resolve(process.cwd() + "/database/database.db");

sqlite3.verbose();
    
const db = await open({
    filename: pathToDatabase,
    driver: sqlite3.cached.Database,
});

const seleniumDriver = await SeleniumEage.init(
    path.resolve("./drivers/edgedriver_win64/msedgedriver.exe")
).initSelenium();

const seleniumRunner = SeleniumRunner.init(seleniumDriver);

const instagramClient = await InstagramClient.init(seleniumDriver)
    .setCookieStoragePath(path.resolve("./cookies"))
    .useSession();

await instagramClient.login(process.env.IG_LOGIN, process.env.IG_PASS);

const worker = InstagramWorker.init({
    AccountManager: AccountManager.init(db),
    SeleniumRunner: seleniumRunner,
    InstagramClient: instagramClient,
    scanInterval: process.env.SCAN_INTERVAL,
    limitLoop: process.env.LIMIT_LOOP,
});

await worker.run(() => {
    console.log("Worked 1 loop");
    console.log(worker.statTickLoop);
});

console.log('Worker is started');

process.on("exit", async () => {
    await worker.stop();
    await db.close();
    console.log("Worker is stopped");
});