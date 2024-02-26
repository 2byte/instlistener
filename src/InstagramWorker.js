import AccountManager from "./AccountManager.js";
import InstagramClient from "./InstagramClient.js";
import SeleniumRunner from "./SeleniumRunner.js";
import pm2 from "pm2";

export default class InstagramWorker {
    /**
     * @type {SeleniumRunner}
     */
    #seleniumRunner = null;
    /**
     * @type {AccountManager}
     */
    #accountManager = null;
    /**
     * @type {InstagramClient}
     */
    #instagramClient = null;
    /**
     * @type {number}
     */
    #scanInterval = 1000 * 60;

    /**
     * @type {Array.<number>}
     */
    #scanIntervalBetween = [0];

    #waitingNewPosts = [];

    #stateTickLoop = {
        addedMedia: 0,
        handledNewAccount: 0,
        handledTrackingAccount: 0,
    };

    #limitLoop = 0;

    #totalStat = {
        countLoop: 0,
        countAddedMedia: 0,
    };

    #scanLoopIsRunned = false;

    #isRestartingSelenium = false;
    #isPause = false;
    #cbEndTick = null;

    /**
     * @param {SeleniumRunner} seleniumRunner
     * @param {AccountManager} accountManager
     * @param {InstagramClient} instagramClient
     * @param {number} scanInterval
     */
    constructor({
        SeleniumRunner,
        AccountManager,
        InstagramClient,
        scanInterval,
        scanIntervalBetween,
        limitLoop,
    }) {
        this.#seleniumRunner = SeleniumRunner;
        this.#accountManager = AccountManager;
        this.#scanInterval = scanInterval;
        this.#scanIntervalBetween = (scanIntervalBetween ?? 0);
        this.#instagramClient = InstagramClient;
        this.#limitLoop = limitLoop ?? 0;
    }

    static init({
        SeleniumRunner,
        AccountManager,
        InstagramClient,
        scanInterval = 10 * 1000 * 60,
        scanIntervalBetween = [0],
        limitLoop = 0,
    }) {
        return new InstagramWorker({
            SeleniumRunner,
            AccountManager,
            InstagramClient,
            scanInterval,
            scanIntervalBetween,
            limitLoop,
        });
    }

    async delayBetweenVisitAccount() {
        // Sleep between visit accounts page
        console.log('scan interval', this.#scanIntervalBetween[0], this.#scanIntervalBetween[0], this.#scanIntervalBetween?.[1])
        if (this.#scanIntervalBetween[0] || (this.#scanIntervalBetween[0] && this.#scanIntervalBetween?.[1])) {
            await new Promise(async (resolve, reject) => {
                const minInterval = +this.#scanIntervalBetween[0] ?? 1;
                const maxInterval = +this.#scanIntervalBetween[1] ?? 2;
                const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

                setTimeout(resolve, randomInterval * 1000);
                console.log('Sleep between visit accounts page', randomInterval);
            });
        } else {
            return Promise.resolve();
        }
    }

    restartWorker(username) {
        return setTimeout(async () => {
            // Check error load page
            if (await this.#instagramClient.checkErrorLoadPage()) {
                console.log('Timeout getting posts doing the pause which error load page');
                return this.doPauseLoop();
            }

            console.log('Restart selenium with username', username);

            if (!this.#isRestartingSelenium) {
                this.#isRestartingSelenium = true;

                pm2.connect((err) => {
                    if (err) {
                        console.error(err)
                        process.exit(2)
                    }

                    pm2.restart('instagramWorker', (err) => {
                        if (err) {
                            console.error(err)
                            process.exit(2)
                        }
                        console.log('Start instagramWorker');

                        this.#isRestartingSelenium = false;
                    });
                });
            }
        }, 1000 * 60 * 2);
    }

    doPauseLoop(time = 60 * 1000 * 20, force = false) {
        if (!this.#isPause || force) {
            this.#isPause = true;

            setTimeout(() => {
                this.#isPause = false;
                console.log('Continues a work scanLoop');

                this.scanLoop(this.#cbEndTick);
            }, time)
        }
    }

    async scanLoop(cbEndTick) {
        this.#cbEndTick = cbEndTick;
        this.#scanLoopIsRunned = true;
        this.#stateTickLoop = {
            handledNewAccount: 0,
            handledTrackingAccount: 0,
            addedMedia: 0,
        };

        const accounts = (await this.#accountManager.loadAccounts()).accounts;

        console.log('accounts.length', accounts.size);

        for (const account of accounts.values()) {

            await this.delayBetweenVisitAccount();

            try {
                this.#waitingNewPosts[account.username] = this.restartWorker(account.username);
            } catch (err) {
                console.log('Error restarting seenium, again attempt restarting', {cause: err});
            }

            if (account.isNew) {
                let post = null;

                try {
                    post = await this.#instagramClient.getFirstPost(
                        account.username
                    );

                    clearTimeout(this.#waitingNewPosts[account.username]);

                    if (post.length === null) continue;

                    account.addMedia(post, false);
                    account.update({ is_new: 0 });

                    this.#stateTickLoop.handledNewAccount += post.length;
                    this.#stateTickLoop.addedMedia += post.length;
                    continue;
                } catch (err) {
                    console.error('Error get first post for user ' + account.username, err);
                }

            }

            try {
                const { posts, video } = await this.#instagramClient.getNewPosts({
                    accountModel: account,
                    publics: await this.#instagramClient.getPosts(account.username),
                });

                video.forEach((v) => v.is_video = 1);

                const medias = [...posts,...video];

                clearTimeout(this.#waitingNewPosts[account.username]);
                //console.log('medias ', medias, account.username, (await account.lastMedia).ig_shortcode);
                if (medias.length === 0) continue;

                try {
                    await account.addMedias(medias, true);
                } catch (err) {
                    console.error('Error adding medias', err);
                }
                console.log('Add counter media', this.#stateTickLoop.addedMedia, medias.length)
                this.#stateTickLoop.addedMedia += medias.length;
            } catch (err) {
                console.error(`${new Date()} Error getting new posts to loop ${account.username}`, err)

                if (err?.cause?.message?.includes('stale element reference: stale') || err?.cause?.message?.includes('Waiting for element to be')) {
                    clearTimeout(this.#waitingNewPosts[account.username]);
                    console.log('Deffering restart loop with pause');
                    this.doPauseLoop();
                }
            }

            this.#stateTickLoop.handledTrackingAccount += 1;
        }

        this.#totalStat.countLoop += 1;
        this.#totalStat.countAddedMedia += this.#stateTickLoop.addedMedia;

        if (typeof cbEndTick === "function") {
            cbEndTick();
        }

        if (
            this.#limitLoop > 0 &&
            this.#totalStat.countLoop >= this.#limitLoop
        ) {
            return this.stop();
        }

        this.#scanLoopIsRunned = false;

        return new Promise(async (resolve, reject) => {
            if (!this.#scanLoopIsRunned) {
                resolve();

                return setTimeout(async () => {
                    if (this.#isPause) {
                        console.log('Loop on paused');
                        return;
                    }
                    await this.scanLoop(cbEndTick);
                }, this.#scanInterval);
            }
        });
    }

    async run(cbEndTick) {
        return this.scanLoop(cbEndTick);
    }

    async stop(msg) {
        if (msg) console.log('Stopped InstagramWorker ', msg);
        this.#scanLoopIsRunned = true;
        return this.#seleniumRunner.stop();
    }

    get statTickLoop() {
        return this.#stateTickLoop;
    }

    get instagramAccountManager() {
        return this.#accountManager;
    }
}
