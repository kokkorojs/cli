"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfig = exports.addBot = exports.parseCommandline = exports.getConfig = void 0;
const path_1 = require("path");
const promises_1 = require("fs/promises");
const util_1 = require("./util");
const config_path = (0, path_1.resolve)(util_1.cwd, 'kkrconfig.json');
const config = require(config_path);
function writeConfig() {
    return (0, promises_1.writeFile)(config_path, `${JSON.stringify(config, null, 2)}`);
}
function getConfig() {
    return config;
}
exports.getConfig = getConfig;
function parseCommandline(commandline) {
    const split = commandline.split(" ");
    let cmd = "", params = [];
    for (let v of split) {
        if (v === "")
            continue;
        if (!cmd)
            cmd = v;
        else
            params.push(v);
    }
    return {
        cmd, params
    };
}
exports.parseCommandline = parseCommandline;
async function addBot(uin, master) {
    const { bots } = config;
    bots[uin] = {
        masters: [master], auto_login: true, prefix: '>', platform: 5, log_level: 'info'
    };
    await writeConfig();
}
exports.addBot = addBot;
async function openAutoLogin(self_id) {
    config.bots[self_id].auto_login = true;
    await writeConfig();
    return `Success: 已开启账号自动登录`;
}
async function closeAutoLogin(self_id) {
    config.bots[self_id].auto_login = false;
    await writeConfig();
    return `Success: 已关闭账号自动登录`;
}
async function addMaster(uin, self_id) {
    const masters = new Set(config.bots[self_id].masters);
    if (!masters.has(uin)) {
        masters.add(uin);
        config.bots[self_id].masters = Array.from(masters);
        await writeConfig();
    }
    return `Success：当前 master 列表：${config.bots[self_id].masters}`;
}
async function deleteMaster(uin, self_id) {
    const masters = new Set(config.bots[self_id].masters);
    if (!masters.has(uin)) {
        return `Error: ${uin} is not defined`;
    }
    masters.delete(uin);
    config.bots[self_id].masters = Array.from(masters);
    await writeConfig();
    return `Success: 当前 master 列表：${config.bots[self_id].masters}`;
}
async function setPrefix(prefix, self_id) {
    if (prefix) {
        const old_prefix = config.bots[self_id].prefix;
        config.bots[self_id].prefix = prefix;
        await writeConfig();
        return `Success: prefix '${old_prefix}' >>> '${config.bots[self_id].prefix}'`;
    }
    else {
        return `Error: prefix 至少需要一个字符`;
    }
}
async function setDefaultPlatform(platform, self_id) {
    const params = [1, 2, 3, 4, 5];
    if (!params.includes(platform))
        return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`;
    const old_platform = config.bots[self_id].platform;
    config.bots[self_id].platform = platform;
    await writeConfig();
    return `Success: platform ${old_platform} >>> ${config.bots[self_id].platform}`;
}
async function setDefaultLogLevel(log_level, self_id) {
    const params = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark', 'off', undefined];
    if (!params.includes(log_level))
        return `Error: platform 的合法值为:\n\t[${params.join(', ')}]`;
    const old_log_level = config.bots[self_id].log_level;
    config.bots[self_id].log_level = log_level;
    await writeConfig();
    return `Success: log_level '${old_log_level}' >>> '${config.bots[self_id].log_level}'`;
}
async function setConfig(params, self_id) {
    if (!params[0])
        return `当前 bot 全局配置：\n${JSON.stringify(config.bots[self_id], null, 2)}`;
    let ret;
    try {
        switch (params[0]) {
            case 'opn-al':
                ret = await openAutoLogin(self_id);
                break;
            case 'cls-al':
                ret = await closeAutoLogin(self_id);
                break;
            case 'add-mst':
                ret = await addMaster(Number(params[1]), self_id);
                break;
            case 'del-mst':
                ret = await deleteMaster(Number(params[1]), self_id);
                break;
            case 'prefix':
                ret = await setPrefix(params[1], self_id);
                break;
            case 'platform':
                ret = await setDefaultPlatform(Number(params[1]), self_id);
                break;
            case 'log_level':
                ret = await setDefaultLogLevel(params[1], self_id);
                break;
            default:
                ret = `Error：未知参数：${params[0]}`;
                break;
        }
    }
    catch {
        ret = 'Error：default-config.json 写入失败，请检查是否被其它程序占用';
    }
    return ret;
}
exports.setConfig = setConfig;
