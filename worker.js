/**
 * Start the worker
 */

import InstagramWorker from './src/InstagramWorker.js';
import AccountManager from './src/AccountManager.js';
import SeleniumRunner from './src/SeleniumRunner.js';
import SeleniumEage from './src/SeleniumEdge.js';
import SeleniumGecko from './src/SeleniumGecko.js';
import InstagramClient from './src/InstagramClient.js';
import * as dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import process from 'node:process';
import yargs from 'yargs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirPath = dirname(fileURLToPath(import.meta.url));

const argv = yargs(process.argv.slice(2))
    .option('withoutRunWorker', {
        alias: 's',
        type: 'boolean',
        default: false,
        describe: 'Start the worker',
    })
    .option('withoutRunSelenium', {
        alias: 'w',
        type: 'boolean',
        default: false,
        describe: 'Without run selenium',
    })
    .option('h', {
        alias: 'h',
        type: 'boolean',
        default: false,
        describe: 'Help',
    }).argv;

console.log(
    'Starting worker without run worker and selenium',
    argv.withoutRunWorker,
    argv.withoutRunSelenium
);
dotenv.config();

const pathToDatabase = path.resolve(currentDirPath + '/database/database.db');

sqlite3.verbose();

const db = await open({
    filename: pathToDatabase,
    driver: sqlite3.Database,
});

if (process.env.ENABLED_SQLITE_TRACE === 'true') {
    db.on('trace', (data) => {
        console.log(data);
    });
}

let initDriver = null;

if (process.platform === 'win32') {
    initDriver = SeleniumEage.init(
        path.resolve('./drivers/edgedriver_win64/msedgedriver.exe')
    );
} else if (process.platform === 'linux') {
    initDriver = SeleniumGecko.init(
        path.resolve('./drivers/geckodriver_linux64/geckodriver')
    );
}

let instagramClient;
let seleniumRunner;
let seleniumDriver;

const initInstagramClient = async () => {
    seleniumDriver = await initDriver.initSelenium();

    seleniumRunner = SeleniumRunner.init(seleniumDriver, initDriver);

    instagramClient = await InstagramClient.init(seleniumRunner.driver)
        .setCookieStoragePath(path.resolve('./cookies'))
        .useSession();
};

const instagramLogin = () => {
    return instagramClient.login(process.env.IG_LOGIN, process.env.IG_PASS);
};

if (!argv.withoutRunSelenium) {

    let attemptInitInstagramClient = 3;

    while (attemptInitInstagramClient > 0) {
        try {
            await initInstagramClient();
            await instagramLogin();
            break;
        } catch (err) {
            console.error('Error login, attempt relogin', err);
        }
        attemptInitInstagramClient--;
    }
}

const scanIntervalBetween = process.env.SCAN_INTERVAL_BETWEEN_ACCOUNT?.includes(',')
    ? process.env.SCAN_INTERVAL_BETWEEN_ACCOUNT.split(',')
    : [process.env.SCAN_INTERVAL_BETWEEN_ACCOUNT];

const worker = InstagramWorker.init({
    AccountManager: AccountManager.init(db),
    SeleniumRunner: seleniumRunner,
    InstagramClient: instagramClient,
    scanInterval: (process.env.SCAN_INTERVAL ?? 1) * 1000 * 60,
    scanIntervalBetween,
    limitLoop: process.env.LIMIT_LOOP,
});

// Api beetween worker and apiServer
process.on('message', async (packet) => {
    if (packet.data.command !== 'getNewMedia') {
        console.log('on message from apiServer', packet);
    }

    const command = packet.data.command;

    const makeDataSend = (attributes) => {
        return {
            type: 'process:msg',
            data: { ...attributes, command },
        };
    };

    switch (command) {
        case 'getAccounts':
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

        case 'addAccount':
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

        case 'deleteAccount':
            await worker.instagramAccountManager.loadAccounts();
            await worker.instagramAccountManager.deleteAccount(
                packet.data.accountId
            );
            process.send(makeDataSend({ success: true }));
            break;

        case 'getAccount':
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

        case 'getNewMedia':
            const media =
                packet.data.accountId !== 'all'
                    ? await worker.instagramAccountManager.find(
                          packet.data.accountId
                      ).newMedias
                    : await worker.instagramAccountManager
                          .getAllAccountNewMedias;

            process.send(
                makeDataSend({
                    success: true,
                    media,
                })
            );
            break;

        case 'getMedia':
            process.send(
                makeDataSend({
                    success: true,
                    media: await worker.instagramAccountManager.find(
                        packet.data.accountId
                    ).medias,
                })
            );
            break;

        case 'mediaFake':
            if (packet.data.mediaAction === 'add') {
                await worker.instagramAccountManager.loadAccounts();
                await worker.instagramAccountManager.addMediaFake({
                    count: packet.data.count,
                    isNew: packet.data?.isNew ?? 0,
                    accountId: packet.data.accountId,
                });
            }
            if (packet.data.mediaAction === 'clear') {
                await worker.instagramAccountManager.clearMedias(
                    packet.data.accountId
                );
            }
            process.send(makeDataSend({ success: true }));
            break;

        case 'track':
            const accountManager = worker.instagramAccountManager;
            await accountManager.loadAccounts();

            if (packet.data.mode === 'enable') {
                await accountManager.track(
                    packet.data.accountId,
                    packet.data.date
                );
            }
            if (packet.data.mode === 'disable') {
                await accountManager.untrack(packet.data.accountId);
            }

            process.send(makeDataSend({ success: true }));
            break;
    }
});

if (!argv.withoutRunWorker) {
    worker.run(() => {
        console.log('Worked 1 loop ', new Date().toLocaleTimeString());
        console.log(worker.statTickLoop);
    });

    console.log('Worker is started');
}

process.on('exit', async () => {
    await worker?.stop();
    await db.close();
    console.log('Worker is stopped');
});
