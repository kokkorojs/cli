import { Client } from "oicq";
import { bindMasterEvents, linkStart } from "./bot";
import { logger } from "./util";

(async () => {
  process.title = 'kokkoro';

  const all_bot: Map<number, Client> = await linkStart();

  if (!all_bot.size) logger.info(`当前无可登录的账号，请检查是否开启 auto_login`);

  all_bot.forEach(bot => {
    bot.once('system.online', () => {
      bindMasterEvents(bot);
      bot.logger.info(`可发送 >help 给机器人查看指令帮助`);
    });
  });
})();