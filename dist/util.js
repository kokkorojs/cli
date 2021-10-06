"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cqcode = exports.checkCommand = exports.tips = exports.colors = exports.platform = exports.uptime = exports.cwd = exports.lowdb = exports.schedule = exports.logger = exports.axios = void 0;
const axios_1 = __importDefault(require("axios"));
exports.axios = axios_1.default;
const lowdb_1 = __importDefault(require("lowdb"));
const FileSync_1 = __importDefault(require("lowdb/adapters/FileSync"));
const node_schedule_1 = __importDefault(require("node-schedule"));
exports.schedule = node_schedule_1.default;
const log4js_1 = require("log4js");
// axios
axios_1.default.defaults.timeout = 10000;
/**
 * 目前 lowdb 版本为 1.0.0 ，因为 2.x 开始就不再支持 commonjs ，node 对于 ems 的支持又不太友好 orz
 * 相关 README 说明: https://github.com/typicode/lowdb/blob/a0048766e75cec31c8d8b74ed44fc1a88284a493/README.md
 */
const lowdb = {
    low: lowdb_1.default, FileSync: FileSync_1.default
};
exports.lowdb = lowdb;
// log4js
const logger = (0, log4js_1.getLogger)('[kokkoro log]');
exports.logger = logger;
const cwd = process.cwd();
exports.cwd = cwd;
const uptime = process.uptime();
exports.uptime = uptime;
const platform = process.platform;
exports.platform = platform;
//#region colorful
/**
 * @description 控制台彩色打印
 * @param code - ANSI escape code
 * @returns - function
 */
function colorful(code) {
    return (msg) => `\u001b[${code}m${msg}\u001b[0m`;
}
//#endregion
const colors = {
    red: colorful(31), green: colorful(32), yellow: colorful(33),
    blue: colorful(34), magenta: colorful(35), cyan: colorful(36), white: colorful(37),
};
exports.colors = colors;
const tips = {
    info: colors.cyan('Info:'), error: colors.red('Error:'),
    warn: colors.yellow('Warn:'), success: colors.green('Success:'),
};
exports.tips = tips;
/**
 * 校验指令
 *
 * @param command - 指令对象
 * @param raw_message - 收到的消息
 * @returns - 返回 command 对象匹配的方法名
 */
function checkCommand(command, raw_message) {
    const keys = Object.keys(command);
    const key_length = keys.length;
    for (let i = 0; i < key_length; i++) {
        const key = keys[i];
        if (!command[key].test(raw_message))
            continue;
        return key;
    }
}
exports.checkCommand = checkCommand;
/**
 * @description 生成图片 CQ 码（oicq 无法 catch 网络图片下载失败，所以单独处理）
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function image(url, flash = false) {
    return new Promise(async (resolve, reject) => {
        // 判断是否为网络链接
        if (!/^https?/g.test(url))
            return resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=${url}]`);
        await axios_1.default.get(url, { responseType: 'arraybuffer' })
            .then(response => {
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=base64://${base64}]`);
        })
            .catch((error) => {
            reject(`Error: ${error.message}\n图片流写入失败，但已为你获取到图片地址:\n${url}`);
        });
    });
}
/**
 * @description 生成 at 成员 CQ 码
 * @param qq
 * @returns
 */
function at(qq) {
    return `[CQ:at,qq=${qq}]`;
}
const cqcode = {
    image, at
};
exports.cqcode = cqcode;
