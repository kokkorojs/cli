"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const help_1 = __importDefault(require("./help"));
const util = __importStar(require("./util"));
const bot_1 = require("./bot");
const setting_1 = require("./setting");
const config_1 = require("./config");
const plugin_1 = require("./plugin");
// 维护组 QQ
const admin = [2225151531];
// 所有机器人实例
const all_bot = new Map();
/**
 * 获取成员等级
 *
 * @param event 群消息事件对象
 * @returns
 * level 0 群成员
 * level 1 群成员
 * level 2 群成员
 * level 3 管  理
 * level 4 群  主
 * level 5 主  人
 * level 6 维护组
 */
function getUserLevel(event) {
    const { self_id, user_id, sender } = event;
    const { level = 0, role = 'member' } = sender;
    const { bots } = config_1.getConfig();
    const { masters, prefix } = bots[self_id];
    let user_level;
    switch (true) {
        case admin.includes(user_id):
            user_level = 6;
            break;
        case masters.includes(user_id):
            user_level = 5;
            break;
        case role === 'owner':
            user_level = 4;
            break;
        case role === 'admin':
            user_level = 3;
            break;
        case level > 4:
            user_level = 2;
            break;
        case level > 2:
            user_level = 1;
            break;
        default:
            user_level = 0;
            break;
    }
    return { user_level, prefix };
}
async function onSetting(event) {
    // const setting = getSetting();
    const { user_level, prefix } = getUserLevel(event);
    if (user_level < 5 || !event.raw_message.startsWith(prefix))
        return;
    const { cmd, params } = config_1.parseCommandline(event.raw_message.replace(prefix, ''));
    this.logger.info(`收到指令，正在处理: ${event.raw_message}`);
    const msg = await groupCmdHanders[cmd]?.call(this, params, event) || `Error：未知指令: ${cmd}`;
    event.reply(msg);
    this.logger.info(`处理完毕，指令回复: ${msg}`);
}
/**
 * 私聊消息监听
 *
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 * @returns
 */
async function onMessage(event) {
    const { user_level, prefix } = getUserLevel(event);
    if (user_level < 5 || !event.raw_message.startsWith(prefix))
        return;
    const { cmd, params } = config_1.parseCommandline(event.raw_message.replace(prefix, ''));
    this.logger.info(`收到指令，正在处理: ${event.raw_message}`);
    const msg = await privateCmdHanders[cmd]?.call(this, params, event) || `Error：未知指令: ${cmd}`;
    event.reply(msg);
    this.logger.info(`处理完毕，指令回复: ${msg}`);
}
function onOnline() {
    broadcastOne(this, `此账号刚刚从掉线中恢复，现在一切正常。`);
}
function onOffline(data) {
    broadcastAll(this.uin + `已离线，\n原因为：${data.message}`);
}
/**
 * 全部 bot 给全部 master 发消息
 *
 * @param message - 发送的消息文本
 */
function broadcastAll(message) {
    const masters = [];
    const bots = config_1.getConfig().bots;
    for (const key in bots)
        masters.push(...bots[key].masters);
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
function broadcastOne(bot, message) {
    const bots = config_1.getConfig().bots;
    for (let master of bots[bot.uin].masters) {
        bot.sendPrivateMsg(master, `通知：\n　　${message}`);
    }
}
async function bindMasterEvents(bot) {
    all_bot.set(bot.uin, bot);
    bot.removeAllListeners('system.login.slider');
    bot.removeAllListeners('system.login.device');
    bot.removeAllListeners('system.login.error');
    bot.on('system.online', onOnline);
    bot.on('system.offline', onOffline);
    bot.on('message.group', onSetting);
    bot.on('message.private', onMessage);
    let num = 0;
    const plugins = await plugin_1.restorePlugins(bot);
    for (let [_, plugin] of plugins) {
        if (plugin.binds.has(bot))
            ++num;
    }
    setTimeout(() => {
        broadcastOne(bot, `启动成功，启用了 ${num} 个插件，发送 ${config_1.getConfig().bots[bot.uin].prefix}help 可以查询 bot 相关指令`);
    }, 3000);
}
const groupCmdHanders = {
    async setting(params, event) {
        if (params[0] === 'help') {
            return help_1.default.setting;
        }
        return await setting_1.setSetting(params, event.self_id, event.group_id);
    },
};
const privateCmdHanders = {
    async help(params) {
        return help_1.default[params[0]] || help_1.default.default;
    },
    async conf(params, data) {
        if (params[0] === 'help') {
            return help_1.default.conf;
        }
        return await config_1.setConfig(params, data.self_id);
    },
    async restart() {
        setTimeout(() => {
            child_process_1.spawn(process.argv.shift(), process.argv, { cwd: util.cwd, detached: true, stdio: 'inherit' }).unref();
            process.exit(0);
        }, 3000);
        return `正在重启程序...`;
    },
    async shutdown() {
        setTimeout(() => process.exit(0), 3000);
        return `正在结束程序...`;
    },
    async echo(params) {
        return params.join(' ');
    },
    async plug(params, data) {
        const cmd = params[0];
        if (!cmd) {
            try {
                const { plugin_modules, node_modules, plugins } = await plugin_1.findAllPlugins();
                const msg = ['可用插件模块列表：'];
                for (let name of [...plugin_modules, ...node_modules]) {
                    if (name.startsWith('kokkoro-plugin-'))
                        name = name.slice(15);
                    const plugin = plugins.get(name);
                    msg.push(`▼ ${name} (${plugin ? '已' : '未'}导入)`);
                    if (plugin) {
                        for (let bot of plugin.binds)
                            msg.push(`\t${bot.nickname} (${bot.uin}),`);
                    }
                }
                msg.push(`\n※ 当前目录共检索到 ${plugin_modules.length + node_modules.length} 个插件`);
                return msg.join('\n');
            }
            catch (e) {
                return `Error: ${e.message}`;
            }
        }
        if (cmd === 'help') {
            return help_1.default.plug;
        }
        const name = params[1];
        const uin = Number(params[2]) || data.self_id;
        const bot = all_bot.get(uin);
        let msg = '';
        try {
            if (!name)
                throw new Error('请输入插件名称');
            switch (cmd) {
                case 'on':
                    if (!bot) {
                        throw new Error('账号输入错误，无法找到该实例');
                    }
                    await plugin_1.enable(name, bot);
                    msg = `${bot.nickname} (${uin}) 启用插件成功`;
                    break;
                case 'off':
                    if (!bot) {
                        throw new Error('账号输入错误，无法找到该实例');
                    }
                    await plugin_1.disable(name, bot);
                    msg = `${bot.nickname} (${uin}) 禁用插件成功`;
                    break;
                case 'on-all':
                    for (let [_, bot] of all_bot) {
                        await plugin_1.enable(name, bot);
                    }
                    msg = '全部机器人启用插件成功';
                    break;
                case 'off-all':
                    for (let [_, bot] of all_bot) {
                        await plugin_1.disable(name, bot);
                    }
                    msg = '全部机器人禁用插件成功';
                    break;
                case 'del':
                    await plugin_1.deletePlugin(name);
                    msg = '卸载插件成功';
                    break;
                case 'restart':
                    await plugin_1.restartPlugin(name);
                    msg = '重启插件成功';
                    break;
                default:
                    throw new Error(`未知参数：${cmd}`);
            }
            return `Success: ${msg}`;
        }
        catch (e) {
            return `Error: ${e.message}`;
        }
    },
    async set(params, data) {
        let bot = all_bot.get(data.self_id);
        let key = params[0];
        let value = params[1];
        if (!key)
            return `当前机器人的运行时参数：\n${JSON.stringify(bot.config, null, 2)}\n※ 修改输入：>set {key} {value}\n※ 修改 platform 需要重新登录`;
        if (!Reflect.has(bot.config, key))
            return `Error：请输入正确的key`;
        if (!value)
            return `Error：请输入正确的value`;
        if (value === `false`)
            value = false;
        if (typeof bot.config[key] === `boolean`)
            value = Boolean(value);
        if (typeof bot.config[key] === `number`)
            value = isNaN(Number(value)) ? bot.config[key] : Number(value);
        bot.config[key] = value;
        if (key === `log_level`) {
            bot.logger.level = value;
        }
        try {
            await bot_1.writeConfBot(bot);
            return `Success: 设置成功`;
        }
        catch (e) {
            return `Error: ${e.message}`;
        }
    },
    async bot(params, data) {
        const msg = [`当前已登录账号：`];
        const cmd = params[0], uin = Number(params[1]);
        if (!cmd) {
            for (let [uin, bot] of all_bot) {
                msg.push(`▼ ${bot.nickname} (${uin})\n\t状　态：${bot.isOnline() ? '在线' : '离线'}\n\t群　聊：${bot.gl.size} 个\n\t好　友：${bot.fl.size} 个\n\t消息量：${bot.getStatus().data?.msg_cnt_per_min} / 分`);
            }
            return msg.join('\n');
        }
        if (cmd === 'help') {
            return help_1.default.bot;
        }
        if (cmd === 'login') {
            switch (true) {
                case all_bot.has(uin):
                    return `Error：已经登录过这个号了`;
                case !uin:
                    return `Error：请输入账号`;
            }
            const bot = await bot_1.createBot(uin, data, this);
            bot?.once('system.online', function () {
                // 写入数据
                config_1.addBot(uin, data.user_id);
                bindMasterEvents(bot);
                data.reply('>登录成功');
            });
            return `>开始登录流程，账号：${uin}`;
        }
        const bot = all_bot.get(uin);
        if (!bot)
            return `Error: 账号输入错误，无法找到该实例`;
        if (cmd === 'off') {
            await bot.logout();
            return `Success：已将该账号下线`;
        }
        else if (cmd === 'on') {
            bot.login();
            return `Sucess：已将该账号上线`;
        }
        else if (cmd === 'del') {
            if (bot.isOnline()) {
                return `Error：此机器人正在登录中，请先离线再删除`;
            }
            await plugin_1.disableAll(bot);
            all_bot.delete(uin);
            return `Sucess：已删除此机器人实例`;
        }
        else {
            return `Error：未知参数：${cmd}`;
        }
    }
};
(async function () {
    process.title = 'kokkoro';
    const all_bot = await bot_1.linkStart();
    if (!all_bot.length)
        util.logger.info(`当前无可登录的账号，请检查是否开启 autologin`);
    for (const bot of all_bot) {
        bot.once('system.online', () => {
            bindMasterEvents(bot);
            bot.logger.info(`可发送 >help 给机器人查看指令帮助`);
        });
    }
})();
