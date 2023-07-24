
export default class SeleniumRunner {

    /**
     * @type {WebDriver}
     */
    #driver = null;

    constructor(driver) {
        this.#driver = driver;
    }

    static init(driver) {
        return new SeleniumRunner(driver);
    }

    async testConnection() {
        await this.#driver.get('https://google.com');
        await this.#driver.wait(async () => await this.#driver.getTitle() === 'Google', 10000);

        return this;
    }

    async stop() {
        return this.#driver.quit();
    }

    get driver() {
        return this.#driver;
    }
}