"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restorePlugins = exports.findAllPlugins = exports.disableAll = exports.disable = exports.enable = exports.rebootPlugin = exports.deletePlugin = void 0;
const path_1 = require("path");
const promises_1 = require("fs/promises");
const util_1 = require("./util");
// 所有插件实例
const plugins = new Map();
class PluginError extends Error {
    constructor() {
        super(...arguments);
        this.name = "PluginError";
    }
}
// #region Plugin 类
class Plugin {
    constructor(name, path) {
        this.name = name;
        this.path = path;
        this.binds = new Set();
        this.fullpath = require.resolve(this.path);
        this.setting = require(this.path).default_setting;
    }
    async _editBotPluginCache(bot, method) {
        const dir = path_1.join(bot.dir, 'config');
        let config;
        let set;
        try {
            config = JSON.parse(await promises_1.readFile(dir, { encoding: 'utf8' }));
            set = new Set(config.plugin);
        }
        catch {
            config = { plugin: [] };
            set = new Set;
        }
        set[method](this.name);
        config.plugin = [...set];
        // 写入群配置
        const { gl } = bot;
        gl.forEach((value, key) => {
            config[key] = {
                name: value.group_name,
                setting: Object.assign({ lock: false, switch: false }, this.setting),
            };
        });
        return promises_1.writeFile(`${dir}.js`, `module.exports = ${JSON.stringify(config, null, 2).replace(/"([^"]+)":/g, '$1:')}`);
    }
    async enable(bot) {
        if (this.binds.has(bot)) {
            throw new PluginError("这个机器人实例已经启用了此插件");
        }
        const mod = require.cache[this.fullpath];
        if (typeof mod?.exports.enable !== "function") {
            throw new PluginError("此插件未导出 enable 方法，无法启用。");
        }
        try {
            const res = mod?.exports.enable(bot);
            if (res instanceof Promise)
                await res;
            await this._editBotPluginCache(bot, "add");
            this.binds.add(bot);
        }
        catch (e) {
            throw new PluginError(`启用插件时遇到错误\n${util_1.error} ${e.message}`);
        }
    }
    async disable(bot) {
        if (!this.binds.has(bot)) {
            throw new PluginError(`这个机器人实例尚未启用此插件`);
        }
        const mod = require.cache[this.fullpath];
        if (typeof mod?.exports.disable !== "function") {
            throw new PluginError(`此插件未导出 disable 方法，无法禁用。`);
        }
        try {
            const res = mod?.exports.disable(bot);
            if (res instanceof Promise)
                await res;
            await this._editBotPluginCache(bot, "delete");
            this.binds.delete(bot);
        }
        catch (e) {
            throw new PluginError(`禁用插件时遇到错误\n${util_1.error} ${e.message}`);
        }
    }
    async goDie() {
        const mod = require.cache[this.fullpath];
        try {
            for (let bot of this.binds) {
                await this.disable(bot);
            }
            if (typeof mod.exports.destroy === "function") {
                const res = mod.exports.destroy();
                if (res instanceof Promise)
                    await res;
            }
        }
        catch { }
        const ix = mod.parent?.children?.indexOf(mod);
        if (ix >= 0)
            mod.parent?.children.splice(ix, 1);
        for (const fullpath in require.cache) {
            if (require.cache[fullpath]?.id.startsWith(mod.path))
                delete require.cache[fullpath];
        }
        delete require.cache[this.fullpath];
    }
    async reboot() {
        try {
            const binded = Array.from(this.binds);
            await this.goDie();
            require(this.path);
            for (let bot of binded)
                await this.enable(bot);
        }
        catch (e) {
            throw new PluginError(`重启插件时遇到错误\n${util_1.error} ${e.message}`);
        }
    }
}
// #endregion
// #region 导入插件
/**
 * @param name - 插件名
 * @returns - Plugin 对象
 * @throws {Error}
 */
async function importPlugin(name) {
    // 加载本地插件
    if (plugins.has(name))
        return plugins.get(name);
    let resolved = "";
    const files = await promises_1.readdir(path_1.join(util_1.cwd, '/plugins'), { withFileTypes: true });
    for (let file of files) {
        if ((file.isDirectory() || file.isSymbolicLink()) && file.name === name) {
            resolved = path_1.join(util_1.cwd, '/plugins', name);
        }
    }
    // 加载 npm 插件
    if (!resolved) {
        const modules = await promises_1.readdir(path_1.join(util_1.cwd, '/node_modules'), { withFileTypes: true });
        for (let file of modules) {
            if (file.isDirectory() && (file.name === name || file.name === "kokkoro-plugin-" + name)) {
                resolved = path_1.join(util_1.cwd, '/node_modules', file.name);
            }
        }
    }
    if (!resolved)
        throw new PluginError(`插件名错误，无法找到此插件`);
    try {
        const plugin = new Plugin(name, resolved);
        plugins.set(name, plugin);
        return plugin;
    }
    catch (err) {
        throw new PluginError(`导入插件失败，不合法的 package\n${util_1.error} ${err.message}`);
    }
}
// #endregion
// #region 校验导入插件
/**
 * @param name - 插件名
 * @returns - Plugin 对象
 */
function checkImported(name) {
    if (!plugins.has(name)) {
        throw new PluginError("尚未安装此插件");
    }
    return plugins.get(name);
}
// #endregion
// #region 卸载插件
/**
 * @param name - 插件名
 * @throws {Error}
 */
async function deletePlugin(name) {
    await checkImported(name).goDie();
    plugins.delete(name);
}
exports.deletePlugin = deletePlugin;
// #endregion
// #region 重启插件
/**
 * @param name - 插件名
 * @throws {Error}
 * @returns - void
 */
function rebootPlugin(name) {
    return checkImported(name).reboot();
}
exports.rebootPlugin = rebootPlugin;
// #endregion
// #region 启用插件
/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 */
async function enable(name, bot) {
    const plugin = await importPlugin(name);
    return plugin.enable(bot);
}
exports.enable = enable;
// #endregion
// #region 禁用插件
/**
 * @param name - 插件名字
 * @param bot - bot 实例
 * @returns - void
 * @throws {Error}
 */
function disable(name, bot) {
    return checkImported(name).disable(bot);
}
exports.disable = disable;
// #endregion
// #region 禁用所有插件
/**
 * @param bot - bot 实例
 * @returns - void
 */
async function disableAll(bot) {
    for (let [_, plugin] of plugins) {
        try {
            await plugin.disable(bot);
        }
        catch { }
    }
}
exports.disableAll = disableAll;
// #endregion
// #region 检索所有可用插件
/**
 * @throws {Error}
 */
async function findAllPlugins() {
    const files = [];
    const modules = [];
    const node_modules = [];
    const plugin_modules = [];
    try {
        files.push(...await promises_1.readdir(path_1.join(util_1.cwd, `/plugins`), { withFileTypes: true }));
    }
    catch (error) {
        await promises_1.mkdir(path_1.join(util_1.cwd, `/plugins`));
    }
    for (let file of files) {
        if (file.isDirectory() || file.isSymbolicLink()) {
            try {
                require.resolve(`${util_1.cwd}/plugins/${file.name}`);
                plugin_modules.push(file.name);
            }
            catch { }
        }
    }
    try {
        modules.push(...await promises_1.readdir(path_1.join(util_1.cwd, '/node_modules'), { withFileTypes: true }));
    }
    catch (err) {
        await promises_1.mkdir(path_1.join(util_1.cwd, `/node_modules`));
    }
    for (let file of modules) {
        if (file.isDirectory() && file.name.startsWith("kokkoro-plugin-")) {
            try {
                require.resolve(`${util_1.cwd}/node_modules/${file.name}`);
                node_modules.push(file.name);
            }
            catch { }
        }
    }
    return {
        plugin_modules, node_modules, plugins
    };
}
exports.findAllPlugins = findAllPlugins;
// #endregion
// #region bot 启动后恢复它原先绑定的插件
/**
 * @param bot - bot 实例
 * @returns Map<string, Plugin>
 */
async function restorePlugins(bot) {
    const dir = path_1.join(bot.dir, 'config.js');
    try {
        const config = JSON.parse(await promises_1.readFile(dir, { encoding: 'utf8' }));
        for (let name of config.plugin) {
            try {
                const plugin = await importPlugin(name);
                await plugin.enable(bot);
            }
            catch (error) {
                util_1.logger.error(error.message);
            }
        }
    }
    catch { }
    return plugins;
}
exports.restorePlugins = restorePlugins;
