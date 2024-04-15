import AccountModel from './AccountModel.js';

export default class AccountManager {

    /**
     * @type {Map<string, AccountModel>}
     */
    #accounts = new Map();
    /**
     * @type {sqlite3.Database}
     */
    db = null;

    constructor(db) {
        this.db = db;
    }

    static init(db) {
        return new AccountManager(db);
    }

    async loadAccounts() {

        await this.db.run("UPDATE `ig_track_accounts` SET `status` = 0 WHERE `tracking_end_date` <= date('now')");

        const accounts = await this.db.all("SELECT * FROM `ig_track_accounts` WHERE `status` = 1");

        for (let account of accounts) {
            const accountModel = AccountModel.make(account, this.db);

            this.#accounts.set(account.username, accountModel);
        }

        return this;
    }

    addAccount(attributes) {
        return AccountModel.create(attributes, this.db);
    }

    async getAccount(id) {
        await this.loadAccounts();

        return this.find(id)?.attributes;
    }

    deleteAccount(id) {
        const account = this.find(id);

        if (account !== undefined) {
            return this.find(id).delete();
        }

        return this.db.exec('DELETE FROM `ig_track_accounts` WHERE `id`='+ id);
    }

    track(id, date) {
        return this.find(id).track({date});
    }

    untrack(id) {
        return this.find(id).untrack();
    }

    /**
     * @param {id} user id
     * @return {AccountModel}
     */
    find(id) {
        return Array.from(this.#accounts.entries()).find(([username, account]) => account.attributes.id === +id)?.[1]
    }

    async addMediaFake({count = 1, isNew = true, accountId}) {
        const accountModel = this.find(accountId);

        if (!accountModel) {
            return false;
        }

        for (let i = 0; i < count; i++) {
            const media = await accountModel.addMediaFake(isNew);
        }

        return true;
    }

    clearMedias(accountId) {
        const accountModel = this.find(accountId);

        return accountModel.clearMedias();
    }

    get accounts() {
        return this.#accounts;
    }

    get getAllAccountNewMedias() {
        return AccountModel.getAllAccountNewMedias(this.db);
    }
}
