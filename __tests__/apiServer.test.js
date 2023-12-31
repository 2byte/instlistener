import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";

describe("API Server testing", () => {
    //config({path: path.resolve(__dirname, '../.env')});

    let worker;

    const runApiServer = async ({ withoutRunWorker = true, withoutRunSelenium = true} = {}) => {
        return new Promise((resolve, reject) => {
            const nodeArgs = [path.resolve(__dirname, "../apiServer.js")];
            if (withoutRunSelenium) {
                nodeArgs.push("--withoutRunSelenium");
            }
            if (withoutRunWorker) {
                nodeArgs.push(`--withoutRunWorker`);
            }

            worker = spawn("node", nodeArgs);

            let dataOutput = "";
            worker.stdout.on("data", (data) => {
                dataOutput += data.toString();
                if (data.toString().includes("Server is running on port")) {
                    console.log(data.toString());
                    resolve(dataOutput);
                }
            });

            let dataError = "";
            worker.stderr.on("data", (data) => {
                console.log(data.toString());
                dataError += data.toString();
            });

            setTimeout(() => {
                if (!dataOutput.includes("Server is running on port")) {
                    console.log(dataOutput, dataError);
                    reject(dataError);
                }
            }, 20000);
        });
    };

    const reqApi = ({
        apiMethod,
        requestMethod = "GET",
        data = {},
        // Flag for enable return response of text
        responseText = false,
    } = {}) => {
        const body = data;

        const fetchParams = {
            method: requestMethod,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        };

        if (Object.keys(body).length > 0) {
            fetchParams.body = JSON.stringify(body);
        }

        return fetch("http://localhost:3000/api/v1/" + apiMethod, fetchParams)
            .then((response) => {
                return responseText ? response.text() : response.json();
            })
            .then((data) => {
                return data;
            })
            .catch((err) => {
                console.log("error connection to server", err);
            });
    };

    const refreshMediaFake = async (accountId, countMedia = 2) => {
        const responseClearMedia = await reqApi({
            apiMethod: `accounts/${accountId}/medias/fake`,
            requestMethod: "POST",
            data: {
                mediaAction: "clear",
            },
            //responseText: true
        });
        console.log("clear medias", responseClearMedia);
        expect(responseClearMedia.success).toBeTruthy();

        const responseCreatingMedia = await reqApi({
            apiMethod: `accounts/${accountId}/medias/fake`,
            requestMethod: "POST",
            data: {
                mediaAction: "add",
                count: countMedia,
                isNew: 1,
            },
        });
        expect(responseCreatingMedia.success).toBeTruthy();
    }

    const addAccount = (username) => {
        const curDate = new Date();

        return fetch("http://localhost:3000/api/v1/accounts/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                username: "username",
                tracking_end_date: `${curDate.getFullYear()}-${
                    curDate.getMonth() + 2
                }-${curDate.getDate()} 23:59:59`,
            }),
        })
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                expect(data).toContain({
                    success: true,
                });
                return data;
            })
            .catch((err) => {
                console.log("error connection to server", err);
            });
    }

    const getAccount = (id) => {
        return reqApi({ apiMethod: "accounts/" + id }).then(
            (data) => {
                //console.log(data)
                expect(data.account).toContain({ id });
                return data;
            }
        );
    }

    beforeAll(async () => {
        try {
            await runApiServer();
        } catch (e) {
            console.log("run api server error", e);
        }
    }, 40000)

    afterAll(async () => {
        return reqApi({
            apiMethod: 'app/stop'
        }).then((data) => {
            expect(data.success).toBeTruthy();
        })
    })

    it("method /api/v1/accounts/all", async () => {
        return fetch("http://localhost:3000/api/v1/accounts/all", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })
            .then((response) => {
                /*response.text().then((text) => {
                    console.log(text, response.status);
                })*/
                return response.json();
            })
            .then((data) => {
                expect(data.length).toBeGreaterThan(0);
            })
            .catch((err) => {
                console.log("error connection to server", err);
            });
    }, 40000);

    it("method /api/v1/accounts/add", async () => {
        
        return addAccount("fake");
    }, 40000);

    it("method /api/v1/accounts/:id", async () => {
        const firstAccountId = (await reqApi({ apiMethod: "accounts/all" }))[0]
            .id;

        return getAccount(firstAccountId)
    }, 40000);

    it("method /api/v1/accounts/:id/medias/new", async () => {
        const firstAccountId = (await reqApi({ apiMethod: "accounts/all" }))[0]
            .id;

        const responseClearMedia = await reqApi({
            apiMethod: `accounts/${firstAccountId}/medias/fake`,
            requestMethod: "POST",
            data: {
                mediaAction: "clear",
            },
            //responseText: true
        });
        console.log("clear medias", responseClearMedia);
        expect(responseClearMedia.success).toBeTruthy();

        const responseCreatingMedia = await reqApi({
            apiMethod: `accounts/${firstAccountId}/medias/fake`,
            requestMethod: "POST",
            data: {
                mediaAction: "add",
                count: 2,
                isNew: 1,
            },
        });
        expect(responseCreatingMedia.success).toBeTruthy();

        return reqApi({
            apiMethod: "accounts/" + firstAccountId + "/medias/new",
        }).then((data) => {
            //console.log(data)
            expect(data.media.length).toEqual(2);
        });
    }, 40000);

    it("method get all medias /api/v1/accounts/:id/medias/", async () => {
        const firstAccountId = (await reqApi({ apiMethod: "accounts/all" }))[0]
        .id;

        await refreshMediaFake(firstAccountId);

        return reqApi({
            requestMethod: "GET",
            apiMethod: `accounts/${firstAccountId}/medias/`,
        }).then((data) => {
            //console.log(data)
            expect(data.media.length).toEqual(2);
        });
    }, 40000);

    it("method get all medias /api/v1/accounts/:id/delete", async () => {
        const insertedAccount = await addAccount('fake');

        return reqApi({
            requestMethod: "POST",
            apiMethod: `accounts/${insertedAccount.account.lastID}/delete/`,
        }).then((data) => {
            //console.log(data)
            expect(data.success).toBeTruthy()
        });
    }, 40000);

    it('method status set stop tracking a account/api/v1/accounts/:id/track', async () => {

        const insertedAccount = await addAccount('fake');

        const responseEnable = await reqApi({
            requestMethod: "POST",
            apiMethod: `accounts/${insertedAccount.account.lastID}/track`,
            data: {mode: 'enable', date: '2024-01-01 23:59:59'}
        });

        expect(responseEnable.success).toBeTruthy();

        const responseDisable = await reqApi({
            requestMethod: "POST",
            apiMethod: `accounts/${insertedAccount.account.lastID}/track`,
            data: {mode: 'disable'}
        });

        expect(responseDisable.success).toBeTruthy();
    }, 40000);

    it('method start worker /api/v1/app/start', async () => {
        return reqApi({
            requestMethod: "GET",
            apiMethod: "app/start",
        }).then((data) => {
            //console.log(data)
            expect(data.success).toBeTruthy()
        })
    }, 40000);

    it('method get status worker /api/v1/app/status', async () => {

        return reqApi({
            requestMethod: "GET",
            apiMethod: "app/status",
        }).then((data) => {
            console.log(data)
            expect(data.success).toBeTruthy()
            expect(data.status).toEqual('online')
        })
    }, 40000);

    it('method stopping worker /api/v1/app/stop', async () => {

        return reqApi({
            requestMethod: "GET",
            apiMethod: "app/stop",
        }).then((data) => {
            console.log(data)
            expect(data.success).toBeTruthy()
        })
    }, 40000);
});
