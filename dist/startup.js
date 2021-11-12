"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
const util_1 = require("./util");
(async () => {
    process.title = 'kokkoro';
    const all_bot = await (0, bot_1.linkStart)();
    if (!all_bot.size)
        util_1.logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);
    all_bot.forEach(bot => {
        bot.once('system.online', () => {
            (0, bot_1.bindMasterEvents)(bot);
            bot.logger.info(`可发送 ">help" 给机器人查看指令帮助`);
        });
    });
})();
