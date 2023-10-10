import AccountManager from "./AccountManager.js";
import InstagramClient from "./InstagramClient.js";
import SeleniumRunner from "./SeleniumRunner.js";

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

    timerInterval = null;

    #stateTickLoop = {};

    #limitLoop = 0;

    #totalStat = {
        countLoop: 0,
        countAddedMedia: 0,
    };

    #scanLoopIsRunned = false;

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
        limitLoop,
    }) {
        this.#seleniumRunner = SeleniumRunner;
        this.#accountManager = AccountManager;
        this.#scanInterval = scanInterval;
        this.#instagramClient = InstagramClient;
        this.#limitLoop = limitLoop ?? 0;
    }

    static init({
        SeleniumRunner,
        AccountManager,
        InstagramClient,
        scanInterval = 10 * 1000 * 60,
        limitLoop = 0,
    }) {
        return new InstagramWorker({
            SeleniumRunner,
            AccountManager,
            InstagramClient,
            scanInterval,
            limitLoop,
        });
    }

    async scanLoop(cbEndTick) {
        this.#scanLoopIsRunned = true;
        this.#stateTickLoop = {
            handledNewAccount: 0,
            handledTrackingAccount: 0,
            addedMedia: 0,
        };

        const accounts = (await this.#accountManager.loadAccounts()).accounts;

        console.log('accounts.length', accounts.size);

        for (const account of accounts.values()) {

            if (account.isNew) {
                try {
                    const post = await this.#instagramClient.getFirstPost(
                        account.username
                    );
                } catch (err) {
                    console.error(err);
                }

                const post = await this.#instagramClient.getFirstPost(
                    account.username
                );

                account.addMedia(post, false);
                account.update({ is_new: 0 });

                this.#stateTickLoop.handledNewAccount += 1;
                this.#stateTickLoop.addedMedia += 1;
                continue;
            }

            try {
                const medias = await this.#instagramClient.getNewPosts(
                    account.username,
                    await (account.lastMedia).ig_shortcode
                );
                //console.log('medias ', medias, account.username, (await account.lastMedia).ig_shortcode);
                if (medias.length === 0) continue;

                try {
                    await account.addMedias(medias, true);
                } catch (err) {
                    console.error('Error adding medias', err);
                }

                this.#stateTickLoop.addedMedia += medias.length;
            } catch (err) {
                console.error(`Error getting new posts to loop ${account.username}`, err)
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

        return new Promise((resolve, reject) => {
            if (!this.timerInterval) {
                this.timerInterval = setInterval(async () => {
                    if (!this.#scanLoopIsRunned) {
                        await this.scanLoop(cbEndTick);
                        resolve();
                    }
                }, this.#scanInterval);
            }
        });
    }

    async run(cbEndTick) {
        return this.scanLoop(cbEndTick);
    }

    async stop() {
        clearInterval(this.timerInterval);
        return this.#seleniumRunner.stop();
    }

    get statTickLoop() {
        return this.#stateTickLoop;
    }

    get instagramAccountManager() {
        return this.#accountManager;
    }
}
