import { spawn } from 'child_process'
import { Client, ConfBot, PrivateMessageEventData, OfflineEventData, GroupMessageEventData, MemberBaseInfo, MessageEventData } from 'oicq'

import help from './help'
import * as util from './util'
import { linkStart, createBot, writeConfBot } from './bot'
import { getSetting, setSetting } from './setting'
import { getConfig, setConfig, parseCommandline, addBot } from './config'
import { restartPlugin, deletePlugin, findAllPlugins, enable, disable, disableAll, restorePlugins } from './plugin'

// 维护组 QQ
const admin = [2225151531];
// 所有机器人实例
const all_bot = new Map<number, Client>();

/**
 * 获取成员等级
 * 
 * @param event 群消息事件对象
 * @returns 
 * level 0 群成员（随活跃度提升）
 * level 1 群成员（随活跃度提升）
 * level 2 群成员（随活跃度提升）
 * level 3 管  理
 * level 4 群  主
 * level 5 主  人
 * level 6 维护组
 */
function getUserLevel(event: MessageEventData): { user_level: number, prefix: string } {
  const { self_id, user_id, sender } = event;
  const { level = 0, role = 'member' } = sender as MemberBaseInfo;
  const { bots } = getConfig();
  const { masters, prefix } = bots[self_id];

  let user_level;

  switch (true) {
    case admin.includes(user_id):
      user_level = 6
      break;
    case masters.includes(user_id):
      user_level = 5
      break;
    case role === 'owner':
      user_level = 4
      break;
    case role === 'admin':
      user_level = 3
      break;
    case level > 4:
      user_level = 2
      break;
    case level > 2:
      user_level = 1
      break;
    default:
      user_level = 0
      break;
  }

  return { user_level, prefix }
}

/**
 * 指令消息监听
 * 
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 */
async function onMessage(this: Client, event: MessageEventData) {
  let message;

  const { message_type, raw_message } = event;
  const { user_level, prefix } = getUserLevel(event);

  // 权限判断，群聊指令需要 level 4 以上，私聊指令需要 level 5 以上
  switch (message_type) {
    case 'group':
      if (user_level < 4 || !raw_message.startsWith(prefix)) return
      break;
    case 'private':
      if (user_level < 5 || !raw_message.startsWith(prefix)) return
      break;
  }

  const { cmd, params } = parseCommandline(raw_message.replace(prefix, ''));

  for (const type of ['all', 'group', 'private']) {
    if (!eval(`cmdHanders.${type}[cmd]`)) continue
    if (message_type !== type && type !== 'all') return

    this.logger.info(`收到指令，正在处理: ${raw_message}`);

    message = await eval(`cmdHanders.${type}[cmd]?.call(this, params, event)`);
  }

  message = message || `Error：未知指令: ${cmd}`;

  event.reply(message);
  this.logger.info(`处理完毕，指令回复: ${message}`);
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
  bot.on('message', onMessage);

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
  [type in 'all' | 'private' | 'group']: {
    [cmd: string]: (
      this: Client,
      params: ReturnType<typeof parseCommandline>['params'],
      event: MessageEventData
    ) => Promise<string>
  }
} = {
  all: {
    //#region echo
    async echo(params) {
      return params.join(' ')
    },
    //#endregion
  },
  group: {
    //#region setting
    async setting(params, event) {
      if (params[0] === 'help') { return help.setting }

      const { self_id, group_id } = event as GroupMessageEventData;
      return await setSetting(params, self_id, group_id)
    },
    //#endregion
  },
  private: {
    //#region help
    async help(params) {
      return help[params[0]] || help.default
    },
    //#endregion
    //#region conf
    async conf(params, event) {
      if (params[0] === 'help') {
        return help.conf
      }

      return await setConfig(params, event.self_id)
    },
    //#endregion
    //#region restart
    async restart() {
      setTimeout(() => {
        spawn(process.argv.shift() as string, process.argv, { cwd: util.cwd, detached: true, stdio: 'inherit' }).unref();
        process.exit(0);
      }, 3000)

      return `正在重启程序...`;
    },
    //#endregion
    //#region shutdown
    async shutdown() {
      setTimeout(() => process.exit(0), 3000);

      return `正在结束程序...`
    },
    //#endregion
    //#region plug
    async plug(params, event) {
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
      const uin = Number(params[2]) || event.self_id;
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
          case 'restart':
            await restartPlugin(name)
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
    //#endregion
    //#region set
    async set(params, event) {
      let bot = all_bot.get(event.self_id) as Client;
      let key = params[0] as keyof ConfBot;
      let value = params[1] as any;

      if (!key)
        return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${event.self_id}" ${JSON.stringify(bot.config, null, 2)}`
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
    //#endregion
    //#region bot
    async bot(params, event) {
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

        const bot = await createBot(uin, <PrivateMessageEventData>event, this);

        bot?.once('system.online', function () {
          // 写入数据
          addBot(uin, event.user_id);

          bindMasterEvents(bot);
          event.reply('>登录成功');
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
    //#endregion
  },
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