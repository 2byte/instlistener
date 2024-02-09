
export default class SeleniumRunner {

    /**
     * @type {WebDriver}
     */
    #driver = null;
    #initDriver

    constructor(driver, initDriver) {
        this.#driver = driver;
        this.#initDriver = initDriver;
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

    async reInitSelenium() {
        this.#driver = await this.#initDriver.initSelenium();
        return this.#driver;
    }

    get driver() {
        return this.#driver;
    }
}
