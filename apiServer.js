import pm2 from "pm2";
import yargs from "yargs";
import express from "express";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const dirpath =  dirname(fileURLToPath(import.meta.url));
const loadEnv = config({
    path: dirpath + "/.env",
});

if (loadEnv.error) {
    throw new Error(loadEnv.error);
}

const argv = yargs(process.argv.slice(2))
    .option("withoutRunWorker", {
        alias: "s",
        type: "boolean",
        default: true,
        describe: "Start the worker",
    })
    .option("withoutRunSelenium", {
        alias: "w",
        type: "boolean",
        default: true,
        describe: "Without run selenium",
    })
    .option("h", {
        alias: "h",
        type: "boolean",
        default: false,
        describe: "Help",
    }).argv;

const processName = "instagramWorker";

const pm2WorkerMakeParams = ({
    withoutRunWorker = false,
    withoutRunSelenium = false,
}) => {
    return {
        script: dirpath + "/worker.js",
        name: processName,
        args:
            (withoutRunWorker ? '--withoutRunWorker ' : '') +
            (withoutRunSelenium ? "--withoutRunSelenium" : ""),
    };
};

const ipc = new (class IPCWorker {
    #queue = [];

    constrctor() {}

    async sendData(pm2Id, command, data = {}) {
        return new Promise((resolve, reject) => {
            if (command) {
                data.command = command;
            }
            pm2.sendDataToProcessId(
                {
                    id: pm2Id,
                    type: "process:msg",
                    data: data,
                    topic: true,
                },
                (err, res) => {
                    if (err) {
                        reject(err);
                    }

                    data.status = "wait";

                    this.#queue.push(data);
                    resolve(res);
                }
            );
        });
    }

    async waitAnswer(command) {
        return new Promise((resolve, reject) => {
            let countRunInterval = 0;
            const limitRunInterval = 15;

            const interval = setInterval(() => {
                const queueCommand = this.#queue.find(
                    (item) => item.command === command
                );

                if (queueCommand.status === "success") {
                    queueCommand.status = "wait";
                    clearInterval(interval);
                    resolve(queueCommand.packet.data);
                } else if (countRunInterval < limitRunInterval) {
                    countRunInterval++;
                } else {
                    clearInterval(interval);
                    reject(new Error("Not answer for command " + command));
                }
            }, 1000);
        });
    }

    listenMessageFromProcess() {
        pm2.launchBus((err, pm2_bus) => {
            if (err) throw err;

            pm2_bus.on("process:msg", (packet) => {
                const command = packet.data.command;

                const commandQueue = this.#queue.find(
                    (item) => item.command === command
                );

                if (commandQueue) {
                    commandQueue.status = "success";
                    commandQueue.packet = packet;
                }

                console.log(
                    "message from process is received, command ",
                    command
                );
            });
        });
    }
})();

const runApiServer = (pm2Id) => {
    const expressApp = express();

    expressApp.use(express.json());

    const router = express.Router();

    router.get("/accounts/all", async (req, res) => {
        await ipc.sendData(pm2Id, "getAccounts");
        const accounts = (await ipc.waitAnswer("getAccounts")).accounts;

        res.json(accounts);
    });
    router.post("/accounts/add", async (req, res) => {
        await ipc.sendData(pm2Id, "addAccount", { accountData: req.body });
        const result = await ipc.waitAnswer("addAccount");

        res.json(result);
    });
    router.get("/accounts/:id", async (req, res) => {
        await ipc.sendData(pm2Id, "getAccount", { accountId: req.params.id });
        const result = await ipc.waitAnswer("getAccount");

        res.json(result);
    });
    router.post("/accounts/:id/medias/fake", async (req, res) => {
        await ipc.sendData(pm2Id, "mediaFake", {
            accountId: req.params.id,
            ...req.body,
        });
        const result = await ipc.waitAnswer("mediaFake");

        res.json(result);
    });
    router.get("/accounts/:id/medias/new", async (req, res) => {
        await ipc.sendData(pm2Id, "getNewMedia", { accountId: req.params.id });
        const result = await ipc.waitAnswer("getNewMedia");

        res.json(result);
    });
    router.get("/accounts/:id/medias", async (req, res) => {
        await ipc.sendData(pm2Id, "getMedia", { accountId: req.params.id });
        const result = await ipc.waitAnswer("getMedia");

        res.json(result);
    });
    router.post("/accounts/:id/delete", async (req, res) => {
        await ipc.sendData(pm2Id, "deleteAccount", {
            accountId: req.params.id,
        });
        const result = await ipc.waitAnswer("deleteAccount");

        res.json(result);
    });
    router.post("/accounts/:id/track", async (req, res) => {
        await ipc.sendData(pm2Id, "track", {
            mode: req.body.mode,
            date: req.body?.date,
            accountId: req.params.id,
        });
        const result = await ipc.waitAnswer("track");

        res.json(result);
    });
    router.get("/app/start", (req, res) => {
        pm2.start(
            pm2WorkerMakeParams({
                withoutRunWorker: argv.withoutRunWorker,
                withoutRunSelenium: argv.withoutRunSelenium,
            }),
            (err, apps) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: err.message });
                    return false;
                }

                res.json({ success: true });
            }
        );
    });
    router.get("/app/status", (req, res) => {
        pm2.list(processName, (err, apps) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
                return false;
            }

            const processInstagramWorker = apps.find(
                (app) => app.pm2_env.name === "instagramWorker"
            );

            if (!processInstagramWorker) {
                return req
                    .status(500)
                    .json({ error: "Not found process", success: false });
            }

            res.json({
                status: processInstagramWorker.pm2_env.status,
                success: true,
            });
        });
    });
    router.get("/app/stop", (req, res) => {
        pm2.stop(processName, (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
                return false;
            }

            res.json({ success: true });
        });
    });

    expressApp.use("/api/:vapi", router);

    expressApp.listen(process.env.SERVER_PORT, () => {
        console.log(`Server is running on port ${process.env.SERVER_PORT}`);
    });
};

pm2.connect((err) => {
    if (err) {
        console.error(err);
    }

    /**
     * Start the worker
     */
    pm2.start(
        pm2WorkerMakeParams({
            withoutRunWorker: argv.withoutRunWorker,
            withoutRunSelenium: argv.withoutRunSelenium,
        }),
        (err, apps) => {
            if (err) {
                console.error(err);
            }

            const process = apps.find(
                (app) => app.pm2_env.name === "instagramWorker"
            );

            pm2.list((err, apps) => {
                if (err) {
                    return console.error(err);
                }

                runApiServer(process.pm2_env.pm_id);
            });
        }
    );
});

/**
 * Get worker instance and run the api server
 */
ipc.listenMessageFromProcess();

process.on('exit', () => {
    pm2.stop(processName, (err) => {
        pm2.disconnect();

        if (err) {
            throw new Error('Erorr stopping process the worker', {cause: err});
        }
    });
});