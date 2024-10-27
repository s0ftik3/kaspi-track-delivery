export class AbstractDeliveryReport {
    constructor(data) {
        this.data = data
    }

    /**
     * @abstract
     */
    full() {}

    /**
     * @abstract
     */
    routes() {}

    /**
     * @abstract
     */
    items() {}

    /**
     * @abstract
     */
    progress() {}
}
