"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSetting = exports.getSetting = void 0;
const path_1 = require("path");
const util_1 = require("./util");
const config_1 = require("./config");
const setting = new Map();
try {
    const config = config_1.getConfig();
    const uins = Object.keys(config.bots);
    for (const uin of uins) {
        const path = path_1.resolve(util_1.cwd, `data/bots/${uin}/config.js`);
        setting.set(Number(uin), require(path));
    }
}
catch { }
// #dregion 列出当前群聊插件设置
function getSetting() {
    return setting;
}
exports.getSetting = getSetting;
// #endregion
// #dregion 写入群聊插件设置
async function setSetting(params, self_id, group_id) {
    if (!params[0])
        return `"${group_id}" ${JSON.stringify(setting.get(self_id)?.[group_id], null, 2)}`;
    return 'setSetting';
}
exports.setSetting = setSetting;
