/**
 * Start the worker
 */

import InstagramWorker from "./src/InstagramWorker.js";
import AccountManager from "./src/AccountManager.js";
import SeleniumRunner from "./src/SeleniumRunner.js";
import SeleniumEage from "./src/SeleniumEdge.js";
import SeleniumGecko from "./src/SeleniumGecko.js";
import InstagramClient from "./src/InstagramClient.js";
import * as dotenv from "dotenv";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import process from "node:process";
import yargs from "yargs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const currentDirPath =  dirname(fileURLToPath(import.meta.url));

const argv = yargs(process.argv.slice(2))
    .option("withoutRunWorker", {
        alias: "s",
        type: "boolean",
        default: false,
        describe: "Start the worker",
    })
    .option("withoutRunSelenium", {
        alias: "w",
        type: "boolean",
        default: false,
        describe: "Without run selenium",
    })
    .option("h", {
        alias: "h",
        type: "boolean",
        default: false,
        describe: "Help",
    }).argv;
    
console.log('Starting worker without run worker and selenium', argv.withoutRunWorker, argv.withoutRunSelenium)
dotenv.config();

const pathToDatabase = path.resolve(currentDirPath + "/database/database.db");

sqlite3.verbose();

const db = await open({
    filename: pathToDatabase,
    driver: sqlite3.cached.Database,
});

db.on('trace', (data) => {
    console.log(data);
});

let initDriver = null;

if (process.platform === "win32") {
    initDriver = await SeleniumEage.init(
        path.resolve("./drivers/edgedriver_win64/msedgedriver.exe")
    );
} else if (process.platform === "linux") {
    initDriver = await SeleniumGecko.init(
        path.resolve("./drivers/geckodriver_linux64/geckodriver")
    );
}

let instagramClient;
let seleniumRunner;

if (!argv.withoutRunSelenium) {
    const seleniumDriver = await initDriver.initSelenium();

    seleniumRunner = SeleniumRunner.init(seleniumDriver);

    instagramClient = await InstagramClient.init(seleniumDriver)
        .setCookieStoragePath(path.resolve("./cookies"))
        .useSession();

    await instagramClient.login(process.env.IG_LOGIN, process.env.IG_PASS);
}

const worker = InstagramWorker.init({
    AccountManager: AccountManager.init(db),
    SeleniumRunner: seleniumRunner,
    InstagramClient: instagramClient,
    scanInterval: (process.env.SCAN_INTERVAL ?? 1) * 1000 * 60,
    limitLoop: process.env.LIMIT_LOOP,
});

if (!argv.withoutRunWorker) {
    await worker.run(() => {
        console.log("Worked 1 loop");
        console.log(worker.statTickLoop);
    });

    console.log("Worker is started");
}

process.on("exit", async () => {
    await worker?.stop();
    await db.close();
    console.log("Worker is stopped");
});

process.on("message", async (packet) => {
    console.log("on message", packet);

    const command = packet.data.command;

    const makeDataSend = (attributes) => {
        return {
            type: "process:msg",
            data: { ...attributes, command },
        };
    };

    switch (command) {
        case "getAccounts":
            process.send(
                makeDataSend({
                    accounts: Array.from(
                        (
                            await worker.instagramAccountManager.loadAccounts()
                        ).accounts.values()
                    ).map((accountModel) => {
                        return accountModel.attributes;
                    }),
                })
            );
            break;

        case "addAccount":
            const insertResult =
                await worker.instagramAccountManager.addAccount(
                    packet.data.accountData
                );
            process.send(
                makeDataSend({
                    success: true,
                    account: insertResult,
                })
            );
            break;

        case "deleteAccount":
            await worker.instagramAccountManager.loadAccounts();
            await worker.instagramAccountManager.deleteAccount(
                packet.data.accountId
            );
            process.send(makeDataSend({ success: true }));
            break;

        case "getAccount":
            const sendPacket = {
                account: await worker.instagramAccountManager.getAccount(
                    packet.data.accountId
                ),
            };

            if (sendPacket.account) {
                sendPacket.success = true;
            } else {
                sendPacket.success = false;
            }

            process.send(makeDataSend(sendPacket));
            break;

        case "getNewMedia":

            const media = packet.data.accountId !== 'all' ? await worker.instagramAccountManager.find(
                packet.data.accountId
            ).newMedias : await worker.instagramAccountManager.getAllAccountNewMedias;

            process.send(
                makeDataSend({
                    success: true,
                    media,
                })
            );
            break;

        case "getMedia":
            process.send(
                makeDataSend({
                    success: true,
                    media: await worker.instagramAccountManager.find(
                        packet.data.accountId
                    ).medias,
                })
            );
            break;

        case "mediaFake":
            if (packet.data.mediaAction === "add") {
                await worker.instagramAccountManager.loadAccounts();
                await worker.instagramAccountManager.addMediaFake({
                    count: packet.data.count,
                    isNew: packet.data?.isNew ?? 0,
                    accountId: packet.data.accountId,
                });
            }
            if (packet.data.mediaAction === "clear") {
                await worker.instagramAccountManager.clearMedias(
                    packet.data.accountId
                );
            }
            process.send(makeDataSend({ success: true }));
            break;

        case "track":
            const accountManager = worker.instagramAccountManager;
            await accountManager.loadAccounts();

            if (packet.data.mode === 'enable') {
                await accountManager.track(packet.data.accountId, packet.data.date);
            }
            if (packet.data.mode === 'disable') {
                await accountManager.untrack(packet.data.accountId);
            }

            process.send(makeDataSend({ success: true }));
            break;
    }
});
