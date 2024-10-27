import { Telegraf, TelegramError } from 'telegraf'
import { KaspiDeliveryDataProvider } from '../providers/delivery-report/kaspi.js'
import { KaspiDeliveryReport } from '../processors/delivery-report/kaspi.js'

export class Bot {
    constructor(token) {
        this.token = token
    }

    /**
     * @param options
     * @returns {Promise<void>}
     */
    async launch(options) {
        const telegraf = new Telegraf(this.token)

        telegraf.catch(this.#handleError)

        telegraf.start(this.#handleStart)
        telegraf.hears(/\d+/, this.#handleReport)

        telegraf.launch(options).catch(err => console.error(err))

        process.once('SIGINT', () => telegraf.stop('SIGINT'))
        process.once('SIGTERM', () => telegraf.stop('SIGTERM'))
        process.on('uncaughtExceptionMonitor', console.error)

        console.log('Bot successfully started!')
    }

    /**
     * @param err
     * @returns {Promise<void>}
     */
    async #handleError(err) {
        if (err.name === 'TimeoutError')
            return console.error('Timeout err', err)
        if (err instanceof TelegramError) return console.error('API err', err)
        console.error('Unexpected err', err)
    }

    /**
     * @param ctx
     * @returns {Promise<void>}
     */
    async #handleStart(ctx) {
        await ctx.reply(
            '👋 Привет! Чтобы отследить заказ, отправь мне его номер из приложения Kaspi.'
        )
    }

    /**
     * @param ctx
     * @returns {Promise<void>}
     */
    async #handleReport(ctx) {
        const messageExtra = {
            reply_to_message_id: ctx.message.message_id,
            allow_sending_without_reply: true,
        }

        const traceId = ctx.match.at(0)
        if (!traceId)
            return ctx.replyWithHTML(
                `❌ <i>Номер заказа в Вашем сообщении не найден.</i>`,
                messageExtra
            )

        const dataProvider = new KaspiDeliveryDataProvider()
        const data = await dataProvider.fetchData(traceId)
        const report = new KaspiDeliveryReport(data)
        const fullData = report.full()

        const hasAnyData =
            fullData &&
            (fullData.progress.length ||
                fullData.routes.length ||
                fullData.items.length)

        if (!hasAnyData)
            return ctx.replyWithHTML(
                `❌ <i>Отчет по отслеживанию для заказа №${traceId} не найден.</i>`,
                messageExtra
            )

        const mapDetails = data => {
            const displayCity = data.city || data.route
            const city = `📍 ${data.city || data.route || 'Не указан'} (🚚 ${data.courier || 'N/A'})`
            const description = `<b>${data.description}</b>`
            const createdAt = data.created_at
            const message = [
                displayCity ? city : undefined,
                description,
                createdAt,
            ]
                .filter(Boolean)
                .join('. ')
            return '→ ' + message
        }

        const items = fullData.items.join(', ')
        const progress = fullData.progress.map(mapDetails).join('\n')
        const routes = fullData.routes.map(mapDetails).join('\n')

        const message =
            `<b>📦 Товары:</b> <code>${items}</code>\n\n` +
            `<b>📈 Обновления по статусу:</b>\n` +
            `<blockquote expandable>${progress}</blockquote>\n\n` +
            `<b>🚛 Детали маршрута:</b>\n` +
            `<blockquote expandable>${routes}</blockquote>\n\n` +
            `<i>Отчет по отслеживанию заказа №${traceId}.</i>`

        await ctx.replyWithHTML(message, messageExtra)
    }
}
