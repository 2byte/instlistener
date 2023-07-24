
export default class AccountModel {
    #attributes = {};
    /**
     * @type {sqlite3.Database}
     */
    #db = null;

    constructor(dataAttributes, db) {
        this.#attributes = dataAttributes;
        this.#db = db;
    }

    static make(dataAttributes, db) {
        return new AccountModel(dataAttributes, db);
    }

    static async createTestAccounts(db) {
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
        
        return db.run('INSERT INTO `ig_track_accounts` (`username`, `status`, `is_new`, `created_at`, `tracking_end_date`) VALUES ' + sqlFieldValues, values)
    }

    get lastMedia() {
        return this.#db.get(
            "SELECT * FROM `ig_account_medias` WHERE `is_new`=0 ORDER BY id DESC LIMIT 1"
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

    createSqlFields(attributes) {
        return Object.keys(attributes)
            .map((key) => {
                return `${key}=?`;
            })
            .join(", ");
    }

    update(attributes) {
        return this.#db.run(
            "UPDATE `ig_account_medias` SET " +
                this.createSqlFields(attributes) +
                " WHERE `id`=?",
            [...Object.values(attributes), this.#attributes.id]
        );
    }
}
