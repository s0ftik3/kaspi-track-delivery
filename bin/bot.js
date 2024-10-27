import { Bot } from '../src/classes/bot.js'

const bot = new Bot('')
await bot.launch({ dropPendingUpdates: true })
