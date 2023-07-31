export default class MediaModel {
    #db = null;

    #attributes = {
        shortcode: null,
        caption: null,
        display_url: null,
        thumbnail_url: null,
        likes: null,
        is_video: null,
    };

    constructor(dataAttributes) {
        this.#attributes = { ...this.#attributes, ...dataAttributes };
        this.#db = db;
    }

    static make(dataAttributes) {
        return new MediaModel({dataAttributes});
    }
}
