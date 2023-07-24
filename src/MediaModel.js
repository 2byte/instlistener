export default class MediaModel {
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
    }

    static make(dataAttributes) {
        return new MediaModel(dataAttributes);
    }
}
