export default class AccountModel {
    #attributes = {};
    /**
     * @type {sqlite3.Database}
     */
    #db = null;

    existsMedia = false;

    constructor(dataAttributes, db) {
        this.#attributes = dataAttributes;
        this.#db = db;
    }

    static make(dataAttributes, db) {
        return new AccountModel(dataAttributes, db);
    }

    static async create(attributes, db) {
        return db.run(
            "INSERT INTO `ig_track_accounts` (`username`, `status`, `is_new`, `created_at`, `tracking_end_date`) VALUES (?, ?, ?, datetime('now'), ?)",
            [attributes.username, 1, 1, attributes.tracking_end_date]
        );
    }

    static async createTestAccounts(db) {
        const accounts = ["razgar.moscow", "rm_motivator", "pj_murano"];

        const sqlFieldValues = accounts
            .map((account) => {
                return `(?, ?, ?, date('now'), datetime('now', '+7 days'))`;
            })
            .join(",");

        const values = accounts
            .map((account) => {
                return [account, 1, 1];
            })
            .flat();

        return db.run(
            "INSERT INTO `ig_track_accounts` (`username`, `status`, `is_new`, `created_at`, `tracking_end_date`) VALUES " +
                sqlFieldValues,
            values
        );
    }

    get newMedias() {
        return this.#db.all(
            "SELECT * FROM `ig_account_medias` WHERE `is_new`=1 AND `account_id`=? ORDER BY id ASC",
            [this.#attributes.id]
        );
    }

    get medias() {
        return this.#db.all(
            "SELECT * FROM `ig_account_medias` WHERE `account_id`=? ORDER BY id ASC",
            [this.#attributes.id]
        );
    }

    get lastMedia() {
        return this.#db.get(
            "SELECT * FROM `ig_account_medias` WHERE `account_id`=? ORDER BY `id` DESC LIMIT 1", this.#attributes.id
        );
    }

    get isNew() {
        return this.#attributes.is_new === 1;
    }

    get username() {
        return this.#attributes.username;
    }

    addMedias(medias, isNew = 0) {
        if (!Array.isArray(medias)) {
            medias = [medias];
        }

        const createSqlPostValueFields = (posts) => {
            return posts
                .map((post) => {
                    return `(${
                        this.#attributes.id
                    }, ?, ?, ?, ?, ?, ?, datetime('now'))`;
                })
                .join(", ");
        };

        const values = medias
            .map((media) => {
                return [
                    media.shortcode,
                    media.display_url,
                    media.caption,
                    media.thumbnail_url,
                    +media.is_video,
                    isNew,
                ];
            })
            .flat();

        return this.#db.run(
            "INSERT INTO `ig_account_medias` (`account_id`, `ig_shortcode`, `url`, `caption`, `thumbnail_url`, `is_video`, `is_new`, `created_at`) VALUES " +
                createSqlPostValueFields(medias),
            values
        );
    }

    addMedia(media, isNew) {
        return this.addMedias(media, isNew);
    }

    addMediaFake(isNew) {
        return this.addMedia(
            {
                shortcode: "fake",
                display_url: "fake",
                caption: "fake",
                thumbnail_url: "fake",
                is_video: 0,
            },
            isNew
        );
    }

    clearMedias() {
        return this.#db.run(
            "DELETE FROM `ig_account_medias` WHERE `account_id`=?",
            [this.#attributes.id]
        );
    }

    createSqlFields(attributes) {
        return Object.keys(attributes)
            .map((key) => {
                return `${key}=?`;
            })
            .join(", ");
    }

    update(attributes) {
        return this.#db.run(
            "UPDATE `ig_track_accounts` SET " +
                this.createSqlFields(attributes) +
                ",`updated_at`=datetime('now')" +
                " WHERE `id`=?",
            [...Object.values(attributes), this.#attributes.id]
        );
    }

    delete() {
        return this.#db.run("DELETE FROM `ig_track_accounts` WHERE `id`=?", [
            this.#attributes.id,
        ]);
    }

    track({ status = 1, date = null } = {}) {
        const curDate = new Date();
        const datetime = `${curDate.getFullYear()}-${curDate.getMonth() + 1}-${
            curDate.getDate() + 4
        }`;

        return this.#db.run(
            "UPDATE `ig_track_accounts` SET `status`=?, `tracking_end_date`=? WHERE `id`=?",
            [status, date ?? datetime, this.#attributes.id]
        );
    }

    untrack() {
        return this.track({ status: 0 });
    }

    get attributes() {
        return this.#attributes;
    }

    static async getAllAccountNewMedias(db) {
        const accountMedias = await db.all(
            "SELECT * FROM `ig_account_medias` WHERE `is_new`=1 ORDER BY id ASC"
        );
        
        await db.run("UPDATE `ig_account_medias` SET `is_new`=0 WHERE `is_new`=1");
        
        return accountMedias;
    }
}
