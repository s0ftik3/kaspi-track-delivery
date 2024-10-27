import { AbstractDeliveryReport } from './abstract.js'
import * as cheerio from 'cheerio'
import {
    itemsWorksheetId,
    progressWorksheetId,
    routesWorksheetId,
} from '../../constants/worksheet.js'
import { TableRowMapping } from '../../utils/table-row-mapping.js'

export class KaspiDeliveryReport extends AbstractDeliveryReport {
    constructor(data) {
        super(data)
        this.parsedProgress = null
        this.parsedRoutes = null
        this.parsedItems = null
    }

    /**
     * @returns {{routes: (*|*[]), progress: (*|*[]), items: (*|*[])}}
     */
    full() {
        return {
            progress: this.progress(),
            routes: this.routes(),
            items: this.items(),
        }
    }

    /**
     * @returns {*|*[]}
     */
    progress() {
        return (
            this.parsedProgress ||
            (this.parsedProgress = this.#parseTableData(
                progressWorksheetId,
                this.data.progress,
                TableRowMapping.mapProgress
            ))
        )
    }

    /**
     * @returns {*|*[]}
     */
    routes() {
        return (
            this.parsedRoutes ||
            (this.parsedRoutes = this.#parseTableData(
                routesWorksheetId,
                this.data.routes,
                TableRowMapping.mapRoutes
            ))
        )
    }

    /**
     * @returns {*[]}
     */
    items() {
        return (
            this.parsedItems ||
            (this.parsedItems = this.#parseTableData(
                itemsWorksheetId,
                this.data.items,
                TableRowMapping.mapItems
            ))
        )
    }

    /**
     * @param id
     * @param data
     * @param mapFn
     * @returns {*[]}
     */
    #parseTableData(id, data, mapFn) {
        if (!data) return []

        const $ = cheerio.load(data)
        const rows = []

        try {
            $(`#${id} tr`).each((_, element) => {
                const columns = $(element).find('td')
                if (columns.length) {
                    rows.push(mapFn($, columns))
                }
            })
        } catch (err) {
            console.error(err)
        }

        return rows
    }
}
