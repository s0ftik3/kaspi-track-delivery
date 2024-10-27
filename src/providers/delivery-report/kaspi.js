import { AbstractDeliveryDataProvider } from './abstract.js'
import * as cheerio from 'cheerio'
import FormData from 'form-data'
import axios from 'axios'
import {
    itemsWorksheetId,
    progressWorksheetId,
    routesWorksheetId,
} from '../../constants/worksheet.js'

export class KaspiDeliveryDataProvider extends AbstractDeliveryDataProvider {
    #TRACK_DELIVERY_PAGE_URL = 'https://shop.kaspi.kz/ords/f?p=104:1'
    #DELIVERY_API_URL = 'https://shop.kaspi.kz/ords/wwv_flow.ajax'

    /**
     * @param traceId
     * @returns {Promise<{routes: *, progress: *, items: *}>}
     */
    async fetchData(traceId) {
        const data = await this.#getRequestData()
        if (!data) return {}

        const [progress, routes, items] = await Promise.all([
            this.#makeDataRequest(
                traceId,
                data,
                data.progress_plugin,
                progressWorksheetId
            ),
            this.#makeDataRequest(
                traceId,
                data,
                data.routes_plugin,
                routesWorksheetId
            ),
            this.#makeDataRequest(
                traceId,
                data,
                data.items_plugin,
                itemsWorksheetId
            ),
        ])

        return { progress, routes, items }
    }

    /**
     * @returns {Promise<{page_items_protected: (*|string), routes_plugin: string, instance: (*|string), salt: (*|string), cookie: string, items_plugin: string, progress_plugin: string}>}
     */
    async #getRequestData() {
        try {
            const response = await axios.get(this.#TRACK_DELIVERY_PAGE_URL)

            const html = response.data

            const cookie = response.headers['set-cookie'].map(e =>
                e.split(';', 1).at(0)
            )
            const cookieString = cookie.join('; ')

            const $ = cheerio.load(html)

            const instance = $('input[id="pInstance"]').attr('value') || ''
            const salt = $('input[id="pSalt"]').attr('value') || ''
            const pageItemsProtected =
                $('input[id="pPageItemsProtected"]').attr('value') || ''

            const scriptContent = $('script[type="text/javascript"]')
                .eq(1)
                .html()
            const ajaxIdentifierMatches = [
                ...scriptContent.matchAll(
                    /p_worksheet_id=(\d+).*"ajaxIdentifier":"(.*?)"/g
                ),
            ]
            const ajaxIdentifiers = Object.fromEntries(
                ajaxIdentifierMatches.map(match => [
                    match[1],
                    match[2].replace('\\u002F', '/'),
                ])
            )

            return {
                cookie: cookieString,
                instance,
                salt,
                page_items_protected: pageItemsProtected,
                progress_plugin: ajaxIdentifiers[progressWorksheetId],
                routes_plugin: ajaxIdentifiers[routesWorksheetId],
                items_plugin: ajaxIdentifiers[itemsWorksheetId],
            }
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * @param traceId
     * @param data
     * @param plugin
     * @param worksheetId
     * @returns {Promise<any>}
     */
    async #makeDataRequest(traceId, data, plugin, worksheetId) {
        const formData = this.#buildFormData(traceId, data, plugin, worksheetId)

        try {
            const response = await axios({
                method: 'POST',
                url: this.#DELIVERY_API_URL,
                headers: {
                    Cookie: data.cookie,
                    ...formData.getHeaders(),
                },
                data: formData,
            })

            return response.data
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * @param traceId
     * @param data
     * @param plugin
     * @param worksheetId
     * @returns {FormData}
     */
    #buildFormData(traceId, data, plugin, worksheetId) {
        const formData = new FormData()
        formData.append('p_flow_id', '104')
        formData.append('p_flow_step_id', '1')
        formData.append('p_instance', String(data.instance))
        formData.append('p_debug', '')
        formData.append('p_request', `PLUGIN=${plugin}`)
        formData.append('p_widget_name', 'worksheet')
        formData.append('p_widget_mod', 'PULL')
        formData.append('p_widget_num_return', '500')
        formData.append('x01', worksheetId)
        formData.append(
            'p_json',
            JSON.stringify({
                pageItems: {
                    itemsToSubmit: [
                        {
                            n: 'P1_EXT_GUID',
                            v: String(traceId),
                        },
                    ],
                    protected: data.page_items_protected,
                    rowVersion: '',
                    formRegionChecksums: [],
                },
                salt: data.salt,
            })
        )
        return formData
    }
}
