"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getList = exports.setSetting = exports.getSetting = void 0;
const path_1 = require("path");
const util_1 = require("./util");
const config_1 = require("./config");
const all_setting = new Map();
try {
    const config = (0, config_1.getConfig)();
    const uins = Object.keys(config.bots);
    for (const uin of uins) {
        const path = (0, path_1.resolve)(util_1.cwd, `data/bots/${uin}/config.json`);
        all_setting.set(Number(uin), require(path));
    }
}
catch { }
// #dregion 列出当前群聊插件设置
function getSetting() {
    return all_setting;
}
exports.getSetting = getSetting;
// #endregion
// #dregion 写入群聊插件设置
async function setSetting(params, self_id, group_id) {
    if (!params[0])
        return `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] || {}, null, 2)}`;
    return 'setSetting';
}
exports.setSetting = setSetting;
// #endregion
// #dregion 获取群聊插件列表
async function getList(self_id, group_id) {
    const { setting } = all_setting.get(self_id)?.[group_id] || { setting: {} };
    const message = ['"list": {'];
    for (const key in setting)
        message.push(`  "${key}": ${setting[key].switch}`);
    message.push('}\n// 如要查看更多信息可输入 >setting');
    return message.join('\n');
}
exports.getList = getList;
