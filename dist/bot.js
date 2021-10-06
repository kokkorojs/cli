"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindMasterEvents = exports.createBot = exports.linkStart = void 0;
const path_1 = require("path");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const oicq_1 = require("oicq");
const help_1 = __importDefault(require("./help"));
const util_1 = require("./util");
const setting_1 = require("./setting");
const config_1 = require("./config");
const plugin_1 = require("./plugin");
// 维护组 QQ
const admin = [2225151531];
// 所有机器人实例
const all_bot = new Map();
/**
 * @description 获取成员等级
 * @param event 群消息事件对象
 * @returns
 *   level 0 群成员（随活跃度提升）
 *   level 1 群成员（随活跃度提升）
 *   level 2 群成员（随活跃度提升）
 *   level 3 管  理
 *   level 4 群  主
 *   level 5 主  人
 *   level 6 维护组
 */
function getUserLevel(event) {
    const { self_id, user_id, sender } = event;
    const { level = 0, role = 'member' } = sender;
    const { bots } = (0, config_1.getConfig)();
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
// 写入 ConfBot
function writeConfBot(bot) {
    return (0, promises_1.writeFile)((0, path_1.join)(bot.dir, 'confbot'), JSON.stringify(bot.config, null, 2));
}
// 读取 ConfBot
async function getConfBot(uin) {
    const file = (0, path_1.join)(util_1.cwd, '/data', String(uin), 'confbot');
    try {
        const raw = await (0, promises_1.readFile)(file, { encoding: 'utf-8' });
        return Object.assign(JSON.parse(raw), { data_dir: (0, path_1.join)(util_1.cwd, '/data') });
    }
    catch {
        return {
            platform: 5,
            log_level: 'info',
            data_dir: (0, path_1.join)(util_1.cwd, '/data/bots')
        };
    }
}
/**
 * @description 全部 bot 给全部 master 发消息
 * @param message - 发送的消息文本
 */
function broadcastAll(message) {
    const bots = (0, config_1.getConfig)().bots;
    for (const bot in bots) {
        const { masters } = bots[bot];
        for (const master of masters) {
            all_bot.forEach(bot => bot.isOnline() && bot.sendPrivateMsg(master, `通知：\n　　${message}`));
        }
    }
}
/**
 * @description 单个 bot 给 masters 发消息
 * @param bot - bot 实例对象
 * @param message - 发送的消息文本
 */
function broadcastOne(bot, message) {
    const { uin } = bot;
    const { bots } = (0, config_1.getConfig)();
    const { masters } = bots[uin];
    for (const master of masters)
        bot.sendPrivateMsg(master, `通知：\n　　${message}`);
}
/**
 * @description 指令消息监听
 * @param this - bot 实例对象
 * @param data - bot 接收到的消息对象
 */
async function onMessage(event) {
    let message;
    const { message_type, raw_message } = event;
    const { user_level, prefix } = getUserLevel(event);
    // 权限判断，群聊指令需要 level 4 以上，私聊指令需要 level 5 以上
    switch (message_type) {
        case 'group':
            if (user_level < 4 || !raw_message.startsWith(prefix))
                return;
            break;
        case 'private':
            if (user_level < 5 || !raw_message.startsWith(prefix))
                return;
            break;
    }
    const { cmd, params } = (0, config_1.parseCommandline)(raw_message.replace(prefix, ''));
    for (const type of ['all', 'group', 'private']) {
        if (!eval(`cmdHanders.${type}[cmd]`))
            continue;
        this.logger.info(`收到指令，正在处理: ${raw_message}`);
        if (message_type !== type && type !== 'all') {
            event.reply(`Error：指令 ${cmd} 不支持${message_type === 'group' ? '群聊' : '私聊'}`);
            return;
        }
        message = await eval(`cmdHanders.${type}[cmd]?.call(this, params, event)`);
    }
    message = message || `Error：未知指令: ${cmd}`;
    event.reply(message);
    this.logger.info(`处理完毕，指令回复: ${message}`);
}
function onOnline() {
    broadcastOne(this, `此账号刚刚从掉线中恢复，现在一切正常。`);
}
function onOffline(event) {
    const { message } = event;
    broadcastAll(this.uin + `已离线，\n原因为：${message}`);
}
// 登录 bot
async function linkStart() {
    const { bots } = (0, config_1.getConfig)();
    for (const key in bots) {
        // 是否自动登录
        const { auto_login } = bots[key];
        if (!auto_login)
            break;
        const uin = Number(key);
        const bot = (0, oicq_1.createClient)(uin, await getConfBot(uin));
        bot.logger.mark(`正在登录账号: ${uin}`);
        bot.on('system.login.slider', function () {
            bot.logger.mark(`取 ticket 教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);
            process.stdout.write('ticket: ');
            process.stdin.once('data', this.sliderLogin.bind(this));
        });
        bot.on('system.login.device', function () {
            bot.logger.mark(`验证完成后敲击 Enter 继续...`);
            process.stdin.once('data', () => this.login());
        });
        bot.on('system.login.error', function (event) {
            const { message } = event;
            if (message.includes('密码错误')) {
                inputPassword();
            }
            else {
                bot.logger.error(`当前账号无法登录，按 Enter 键退出程序...`);
                this.terminate();
                process.stdin.once('data', process.exit);
            }
        });
        function inputPassword() {
            bot.logger.mark(`首次登录请输入密码：`);
            process.stdin.once('data', async (data) => {
                const input = String(data).trim();
                if (!input.length)
                    return inputPassword();
                const password = (0, crypto_1.createHash)('md5').update(input).digest();
                await (0, promises_1.writeFile)((0, path_1.join)(bot.dir, 'password'), password, { mode: 0o600 });
                bot.login(password);
            });
        }
        try {
            bot.login(await (0, promises_1.readFile)((0, path_1.join)(bot.dir, 'password')));
        }
        catch {
            inputPassword();
        }
        all_bot.set(uin, bot);
    }
    return all_bot;
}
exports.linkStart = linkStart;
// 创建 bot
async function createBot(uin, delegate, eins) {
    let bot;
    try {
        bot = (0, oicq_1.createClient)(uin, await getConfBot(uin));
    }
    catch (e) {
        delegate.reply(`Error：账号输入错误`);
        return;
    }
    // 滑动验证码事件
    bot.on('system.login.slider', function (event) {
        const { url } = event;
        delegate.reply(`>登录流程：收到滑动验证码，请前往 ${url} 完成滑动并取出ticket输入。\n>取消登录输入：'cancel'
>取ticket教程：https://github.com/takayama-lily/oicq/wiki/01.滑动验证码和设备锁`);
        eins.on('message.private', function slider(event) {
            const { user_id, raw_message } = event;
            if (user_id === delegate.user_id) {
                this.off('message.private', slider);
                if (raw_message === 'cancel') {
                    delegate.reply(`>登录流程：已取消`);
                    bot.terminate();
                }
                else {
                    bot.sliderLogin(raw_message);
                }
            }
        });
    });
    // 设备锁事件
    bot.on('system.login.device', function (event) {
        const { url } = event;
        delegate.reply(`>登录流程：需要验证设备锁，请前往 ${url} 完成验证后输入'ok'。\n>取消登录输入：'cancel'`);
        eins.on('message.private', function device(event) {
            const { user_id, raw_message } = event;
            if (user_id === delegate.user_id) {
                this.off('message.private', device);
                if (raw_message === 'cancel') {
                    delegate.reply(`>登录流程：已取消`);
                    bot.terminate();
                }
                else {
                    bot.login();
                    delegate.reply(`>登录流程完成，可使用 >bot 命令查看是否登录成功`);
                }
            }
        });
    });
    bot.on('system.login.error', function (event) {
        const { message } = event;
        if (message.includes('密码错误')) {
            delegate.reply(`>登录流程：密码错误！`);
            inputPassword();
        }
        else {
            this.terminate();
            delegate.reply(`>登录流程遇到错误：${message}\n>登录已取消`);
        }
    });
    function inputPassword() {
        delegate.reply(`>登录流程：首次登录请输入密码\n>取消登录输入："cancel"`);
        eins.on('message.private', async function login(event) {
            const { user_id, raw_message } = event;
            if (user_id === delegate.user_id) {
                this.off('message.private', login);
                if (raw_message === 'cancel') {
                    delegate.reply('>登录流程：已取消');
                }
                else {
                    const password = (0, crypto_1.createHash)('md5').update(raw_message).digest();
                    await (0, promises_1.writeFile)((0, path_1.join)(bot.dir, 'password'), password, { mode: 0o600 });
                    bot.login(password);
                }
            }
        });
    }
    try {
        bot.login(await (0, promises_1.readFile)((0, path_1.join)(bot.dir, 'password')));
    }
    catch {
        inputPassword();
    }
    return bot;
}
exports.createBot = createBot;
async function bindMasterEvents(bot) {
    const { uin } = bot;
    all_bot.set(uin, bot);
    bot.removeAllListeners('system.login.slider');
    bot.removeAllListeners('system.login.device');
    bot.removeAllListeners('system.login.error');
    bot.on('system.online', onOnline);
    bot.on('system.offline', onOffline);
    bot.on('message', onMessage);
    let number = 0;
    const plugins = await (0, plugin_1.restorePlugins)(bot);
    for (let [_, plugin] of plugins) {
        if (plugin.binds.has(bot))
            ++number;
    }
    setTimeout(() => {
        broadcastOne(bot, `启动成功，启用了 ${number} 个插件，发送 ${(0, config_1.getConfig)().bots[uin].prefix}help 可以查询 bot 相关指令`);
    }, 1000);
}
exports.bindMasterEvents = bindMasterEvents;
const cmdHanders = {
    all: {
        //#region echo
        async echo(params) {
            return params.join(' ');
        },
        //#endregion
    },
    group: {
        //#region setting
        async setting(params, event) {
            if (params[0] === 'help') {
                return help_1.default.setting;
            }
            const { self_id, group_id } = event;
            return await (0, setting_1.setSetting)(params, self_id, group_id);
        },
        //#endregion
        //#region list
        async list(params, event) {
            console.log(11111);
            const { self_id, group_id } = event;
            return (0, setting_1.getList)(self_id, group_id);
        },
        //#endregion
    },
    private: {
        //#region help
        async help(params) {
            return help_1.default[params[0]] || help_1.default.default;
        },
        //#endregion
        //#region conf
        async conf(params, event) {
            if (params[0] === 'help') {
                return help_1.default.conf;
            }
            return await (0, config_1.setConfig)(params, event.self_id);
        },
        //#endregion
        //#region restart
        async restart() {
            setTimeout(() => {
                (0, child_process_1.spawn)(process.argv.shift(), process.argv, { cwd: util_1.cwd, detached: true, stdio: 'inherit' }).unref();
                process.exit(0);
            }, 3000);
            return `正在重启程序...`;
        },
        //#endregion
        //#region shutdown
        async shutdown() {
            setTimeout(() => process.exit(0), 3000);
            return `正在结束程序...`;
        },
        //#endregion
        //#region plug
        async plug(params, event) {
            const cmd = params[0];
            if (!cmd) {
                try {
                    const { plugin_modules, node_modules, plugins } = await (0, plugin_1.findAllPlugins)();
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
                catch (error) {
                    const { message } = error;
                    return `Error: ${message}`;
                }
            }
            if (cmd === 'help') {
                return help_1.default.plug;
            }
            const name = params[1];
            const uin = Number(params[2]) || event.self_id;
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
                        await (0, plugin_1.enable)(name, bot);
                        msg = `${bot.nickname} (${uin}) 启用插件成功`;
                        break;
                    case 'off':
                        if (!bot) {
                            throw new Error('账号输入错误，无法找到该实例');
                        }
                        await (0, plugin_1.disable)(name, bot);
                        msg = `${bot.nickname} (${uin}) 禁用插件成功`;
                        break;
                    case 'on-all':
                        for (let [_, bot] of all_bot) {
                            await (0, plugin_1.enable)(name, bot);
                        }
                        msg = '全部机器人启用插件成功';
                        break;
                    case 'off-all':
                        for (let [_, bot] of all_bot) {
                            await (0, plugin_1.disable)(name, bot);
                        }
                        msg = '全部机器人禁用插件成功';
                        break;
                    case 'del':
                        await (0, plugin_1.deletePlugin)(name);
                        msg = '卸载插件成功';
                        break;
                    case 'restart':
                        await (0, plugin_1.restartPlugin)(name);
                        msg = '重启插件成功';
                        break;
                    default:
                        throw new Error(`未知参数：${cmd}`);
                }
                return `Success: ${msg}`;
            }
            catch (error) {
                const { message } = error;
                return `Error: ${message}`;
            }
        },
        //#endregion
        //#region set
        async set(params, event) {
            let bot = all_bot.get(event.self_id);
            let key = params[0];
            let value = params[1];
            if (!key)
                return `// 修改输入：>set <key> <value>\n// 修改 platform 需要重新登录\n"${event.self_id}" ${JSON.stringify(bot.config, null, 2)}`;
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
                await writeConfBot(bot);
                return `Success: 设置成功`;
            }
            catch (error) {
                const { message } = error;
                return `Error: ${message}`;
            }
        },
        //#endregion
        //#region bot
        async bot(params, event) {
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
                const bot = await createBot(uin, event, this);
                bot?.once('system.online', function () {
                    // 写入数据
                    (0, config_1.addBot)(uin, event.user_id);
                    bindMasterEvents(bot);
                    event.reply('>登录成功');
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
                await (0, plugin_1.disableAll)(bot);
                all_bot.delete(uin);
                return `Sucess：已删除此机器人实例`;
            }
            else {
                return `Error：未知参数：${cmd}`;
            }
        }
        //#endregion
    },
};
