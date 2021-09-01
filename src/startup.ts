import { spawn } from 'child_process'
import { Client, ConfBot, PrivateMessageEventData, OfflineEventData } from 'oicq'

import help from './help'
import * as util from './util'
import { linkStart, createBot, writeConfBot } from './bot'
import { getConfig, setConfig, parseCommandline, addBot } from './config'
import { rebootPlugin, deletePlugin, findAllPlugins, enable, disable, disableAll, restorePlugins } from './plugin'

// 所有机器人实例
const all_bot = new Map<number, Client>();

/**
 * 私聊消息监听
 * 
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 * @returns 
 */
async function onMessage(this: Client, data: PrivateMessageEventData) {
  const { self_id } = data;
  const { bots } = getConfig();
  const { masters, prefix } = bots[self_id];

  if (!masters.includes(data.user_id) || !data.raw_message.startsWith(prefix)) return

  const { cmd, params } = parseCommandline(data.raw_message.replace(prefix, ''));

  this.logger.info(`收到指令，正在处理: ${data.raw_message}`);

  const msg = await cmdHanders[cmd]?.call(this, params, data) || `Error：未知指令: ${cmd}`;

  data.reply(msg);

  this.logger.info(`处理完毕，指令回复: ${msg}`);
}

function onOnline(this: Client) {
  broadcastOne(this, `此账号刚刚从掉线中恢复，现在一切正常。`)
}

function onOffline(this: Client, data: OfflineEventData) {
  broadcastAll(this.uin + `已离线，\n原因为：${data.message}`)
}

/**
 * 全部 bot 给全部 master 发消息
 * 
 * @param message - 发送的消息文本
 */
function broadcastAll(message: string) {
  const masters = [];
  const bots = getConfig().bots;

  for (const key in bots) masters.push(...bots[key].masters);
  for (let master of masters) {
    for (let [_, bot] of all_bot) {
      if (bot.isOnline()) {
        bot.sendPrivateMsg(master, `通知：\n　　${message}`);
      }
    }
  }
}

/**
 * 单个 bot 给 masters 发消息
 * 
 * @param bot - bot 实例对象
 * @param message - 发送的消息文本
 */
function broadcastOne(bot: Client, message: string) {
  const bots = getConfig().bots;

  for (let master of bots[bot.uin].masters) {
    bot.sendPrivateMsg(master, `通知：\n　　${message}`);
  }
}

async function bindMasterEvents(bot: Client) {
  all_bot.set(bot.uin, bot);
  bot.removeAllListeners('system.login.slider');
  bot.removeAllListeners('system.login.device');
  bot.removeAllListeners('system.login.error');
  bot.on('system.online', onOnline);
  bot.on('system.offline', onOffline);
  bot.on('message.private', onMessage);

  let num = 0;
  const plugins = await restorePlugins(bot);

  for (let [_, plugin] of plugins) {
    if (plugin.binds.has(bot)) ++num
  }
  setTimeout(() => {
    broadcastOne(bot, `启动成功，启用了 ${num} 个插件，发送 ${getConfig().bots[bot.uin].prefix}help 可以查询 bot 相关指令`)
  }, 3000);
}

const cmdHanders: {
  [k: string]: (
    this: Client,
    params: ReturnType<typeof parseCommandline>['params'],
    data: PrivateMessageEventData
  ) => Promise<string>
} = {
  async help(params) {
    return help[params[0]] || help.default
  },
  async conf(params, data) {
    if (params[0] === 'help') {
      return help.conf
    }

    return await setConfig(params, data.self_id)
  },
  async restart() {
    setTimeout(() => {
      spawn(process.argv.shift() as string, process.argv, { cwd: util.cwd, detached: true, stdio: 'inherit' }).unref();
      process.exit(0);
    }, 3000)

    return `正在重启程序...`;
  },
  async shutdown() {
    setTimeout(() => process.exit(0), 3000);

    return `正在结束程序...`
  },
  async echo(params) {
    return params.join(' ')
  },
  async plug(params, data) {
    const cmd = params[0];

    if (!cmd) {
      try {
        const { plugin_modules, node_modules, plugins } = await findAllPlugins();
        const msg = ['可用插件模块列表：'];

        for (let name of [...plugin_modules, ...node_modules]) {
          if (name.startsWith('kokkoro-plugin-')) name = name.slice(15)

          const plugin = plugins.get(name);
          msg.push(`▼ ${name} (${plugin ? '已' : '未'}导入)`);

          if (plugin) {
            for (let bot of plugin.binds) msg.push(`\t${bot.nickname} (${bot.uin}),`);
          }
        }
        msg.push(`\n※ 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件`);

        return msg.join('\n')
      } catch (e) {
        return `Error: ${e.message}`
      }
    }
    if (cmd === 'help') {
      return help.plug
    }
    const name = params[1];
    const uin = Number(params[2]) || data.self_id;
    const bot = all_bot.get(uin);
    let msg = '';

    try {
      if (!name)
        throw new Error('请输入插件名称')
      switch (cmd) {
        case 'on':
          if (!bot) {
            throw new Error('账号输入错误，无法找到该实例')
          }
          await enable(name, bot)
          msg = `${bot.nickname} (${uin}) 启用插件成功`
          break
        case 'off':
          if (!bot) {
            throw new Error('账号输入错误，无法找到该实例')
          }
          await disable(name, bot)
          msg = `${bot.nickname} (${uin}) 禁用插件成功`
          break
        case 'on-all':
          for (let [_, bot] of all_bot) {
            await enable(name, bot)
          }
          msg = '全部机器人启用插件成功'
          break
        case 'off-all':
          for (let [_, bot] of all_bot) {
            await disable(name, bot)
          }
          msg = '全部机器人禁用插件成功'
          break
        case 'del':
          await deletePlugin(name)
          msg = '卸载插件成功'
          break
        case 'reboot':
          await rebootPlugin(name)
          msg = '重启插件成功'
          break
        default:
          throw new Error(`未知参数：${cmd}`)
      }
      return `Success: ${msg}`
    } catch (e) {
      return `Error: ${e.message}`
    }
  },

  async set(params, data) {
    let bot = all_bot.get(data.self_id) as Client;
    let key = params[0] as keyof ConfBot;
    let value = params[1] as any;

    if (!key)
      return `当前机器人的运行时参数：\n${JSON.stringify(bot.config, null, 2)}\n※ 修改输入：>set {key} {value}\n※ 修改 platform 需要重新登录`
    if (!Reflect.has(bot.config, key))
      return `Error：请输入正确的key`
    if (!value)
      return `Error：请输入正确的value`
    if (value === `false`)
      value = false
    if (typeof bot.config[key] === `boolean`)
      value = Boolean(value)
    if (typeof bot.config[key] === `number`)
      value = isNaN(Number(value)) ? bot.config[key] : Number(value)
    bot.config[key] = value;
    if (key === `log_level`) {
      bot.logger.level = value
    }

    try {
      await writeConfBot(bot)
      return `Success: 设置成功`
    } catch (e) {
      return `Error: ${e.message}`
    }
  },

  async bot(params, data) {
    const msg: string[] = [`当前已登录账号：`];
    const cmd = params[0], uin = Number(params[1])

    if (!cmd) {
      for (let [uin, bot] of all_bot) {
        msg.push(`▼ ${bot.nickname} (${uin})\n\t状　态：${bot.isOnline() ? '在线' : '离线'}\n\t群　聊：${bot.gl.size} 个\n\t好　友：${bot.fl.size} 个\n\t消息量：${bot.getStatus().data?.msg_cnt_per_min} / 分`);
      }
      return msg.join('\n');
    }

    if (cmd === 'help') {
      return help.bot
    }

    if (cmd === 'login') {
      switch (true) {
        case all_bot.has(uin):
          return `Error：已经登录过这个号了`
        case !uin:
          return `Error：请输入账号`
      }

      const bot = await createBot(uin, data, this);

      bot?.once('system.online', function () {
        // 写入数据
        addBot(uin, data.user_id);

        bindMasterEvents(bot);
        data.reply('>登录成功');
      })

      return `>开始登录流程，账号：${uin}`
    }

    const bot = all_bot.get(uin)
    if (!bot)
      return `Error: 账号输入错误，无法找到该实例`
    if (cmd === 'off') {
      await bot.logout()
      return `Success：已将该账号下线`
    } else if (cmd === 'on') {
      bot.login()
      return `Sucess：已将该账号上线`
    } else if (cmd === 'del') {
      if (bot.isOnline()) {
        return `Error：此机器人正在登录中，请先离线再删除`
      }
      await disableAll(bot)
      all_bot.delete(uin)
      return `Sucess：已删除此机器人实例`
    } else {
      return `Error：未知参数：${cmd}`
    }
  }
};

(async function () {
  process.title = 'kokkoro';

  const all_bot = await linkStart() as Client[];

  if (!all_bot.length) util.logger.info(`当前无可登录的账号，请检查是否开启 autologin`);

  for (const bot of all_bot) {
    bot.once('system.online', () => {
      bindMasterEvents(bot);
      bot.logger.info(`可发送 >help 给机器人查看指令帮助`);
    });
  }
})();