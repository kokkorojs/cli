"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.at = exports.sendImage = exports.checkCommand = exports.success = exports.warn = exports.error = exports.info = exports.white = exports.cyan = exports.magenta = exports.blue = exports.yellow = exports.green = exports.red = exports.platform = exports.uptime = exports.cwd = exports.logger = exports.axios = void 0;
const axios_1 = __importDefault(require("axios"));
exports.axios = axios_1.default;
const log4js_1 = require("log4js");
// axios
axios_1.default.defaults.timeout = 10000;
// log4js
const logger = log4js_1.getLogger('[kokkoro log]');
exports.logger = logger;
logger.level = 'all';
const cwd = process.cwd();
exports.cwd = cwd;
const uptime = process.uptime();
exports.uptime = uptime;
const platform = process.platform;
exports.platform = platform;
/**
 * 控制台彩色打印
 *
 * @param code - ANSI escape code
 * @returns - function
 */
function color(code) {
    return (msg) => `\u001b[${code}m${msg}\u001b[0m`;
}
const red = color(31);
exports.red = red;
const green = color(32);
exports.green = green;
const yellow = color(33);
exports.yellow = yellow;
const blue = color(34);
exports.blue = blue;
const magenta = color(35);
exports.magenta = magenta;
const cyan = color(36);
exports.cyan = cyan;
const white = color(37);
exports.white = white;
const info = cyan('Info:');
exports.info = info;
const error = red('Error:');
exports.error = error;
const warn = yellow('Warn:');
exports.warn = warn;
const success = green('Success:');
exports.success = success;
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
 * 发送图片（oicq 无法捕捉网络图片是否下载失败，所以单独处理）
 *
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns - Promise
 */
function sendImage(url, flash = false) {
    return new Promise(async (resolve, reject) => {
        // 判断是否为网络链接
        if (!/^https?/g.test(url))
            return resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=${url}]`);
        await axios_1.default.get(url, { responseType: 'arraybuffer' })
            .then((res) => {
            const buffer = Buffer.from(res.data, "binary");
            resolve(`[CQ:image,${flash ? 'type=flash,' : ''}file=${buffer}]`);
        })
            .catch((error) => {
            reject(error);
        });
    });
}
exports.sendImage = sendImage;
/**
 * 生成 at 字段 CQ 码
 *
 * @param qq
 * @returns
 */
function at(qq) {
    return `[CQ:at,qq=${qq}]`;
}
exports.at = at;
