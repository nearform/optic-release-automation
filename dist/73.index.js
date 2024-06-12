export const id = 73;
export const ids = [73];
export const modules = {

/***/ 4098:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 4098;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 1073:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Bumper": () => (/* reexport */ Bumper),
  "packagePrefix": () => (/* reexport */ packagePrefix)
});

// EXTERNAL MODULE: external "child_process"
var external_child_process_ = __webpack_require__(2081);
;// CONCATENATED MODULE: ./node_modules/@conventional-changelog/git-client/dist/utils.js
/* eslint-disable @typescript-eslint/no-misused-promises */

/**
 * Catch process error.
 * @param child
 * @returns Process error.
 */
function catchProcessError(child) {
    return new Promise((resolve) => {
        let stderr = '';
        let error = null;
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (err) => {
            error = err;
        });
        child.on('close', () => {
            if (stderr) {
                error = new Error(stderr);
            }
            resolve(error);
        });
    });
}
/**
 * Spawn child process and return stdout stream.
 * @param cmd
 * @param args
 * @param options
 * @yields Stdout chunks.
 */
async function* stdoutSpawn(cmd, args, options) {
    const child = (0,external_child_process_.spawn)(cmd, args, options);
    const errorPromise = catchProcessError(child);
    yield* child.stdout;
    const error = await errorPromise;
    if (error) {
        throw error;
    }
}
/**
 * Spawn child process.
 * @param cmd
 * @param args
 * @param options
 * @returns Process output.
 */
async function spawn(cmd, args, options) {
    const stdout = stdoutSpawn(cmd, args, options);
    let chunk;
    const output = [];
    for await (chunk of stdout) {
        output.push(chunk);
    }
    return Buffer.concat(output);
}
/**
 * Split stream by separator.
 * @param stream
 * @param separator
 * @yields String chunks.
 */
async function* splitStream(stream, separator) {
    let chunk;
    let payload;
    let buffer = '';
    for await (chunk of stream) {
        buffer += chunk.toString();
        if (buffer.includes(separator)) {
            payload = buffer.split(separator);
            buffer = payload.pop() || '';
            yield* payload;
        }
    }
    if (buffer) {
        yield buffer;
    }
}
/**
 * Format key-value pair for cli arguments.
 * @param key
 * @param value
 * @returns Formatted key-value pair.
 */
function formatKeyValue(key, value) {
    return `${key.length === 1 ? '-' : '--'}${key.replace(/[A-Z]/g, '-$&').toLowerCase()}${value ? `=${value}` : ''}`;
}
/**
 * Format object params for cli arguments.
 * @param params
 * @returns Formatted params.
 */
function formatParams(params) {
    const args = [];
    let key;
    let value;
    let arrayValue;
    for (key in params) {
        value = params[key];
        if (value === true) {
            args.push(formatKeyValue(key));
        }
        else if (value === false) {
            args.push(formatKeyValue(`no-${key}`));
        }
        else if (Array.isArray(value)) {
            for (arrayValue of value) {
                args.push(formatKeyValue(key, arrayValue));
            }
        }
        else if (value) {
            args.push(formatKeyValue(key, value));
        }
    }
    return args;
}
/**
 * Format arguments.
 * @param args
 * @returns Formatted arguments.
 */
function formatArgs(...args) {
    const finalArgs = [];
    for (const arg of args) {
        if (!arg) {
            continue;
        }
        if (Array.isArray(arg)) {
            finalArgs.push(...formatArgs(...arg));
        }
        else if (typeof arg === 'object' && !(arg instanceof RegExp)) {
            finalArgs.push(...formatParams(arg));
        }
        else {
            finalArgs.push(String(arg));
        }
    }
    return finalArgs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELE9BQU8sRUFHTCxLQUFLLElBQUksVUFBVSxFQUNwQixNQUFNLGVBQWUsQ0FBQTtBQVF0Qjs7OztHQUlHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxLQUFxQztJQUM5RCxPQUFPLElBQUksT0FBTyxDQUFlLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0MsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2YsSUFBSSxLQUFLLEdBQWlCLElBQUksQ0FBQTtRQUU5QixLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBRTtZQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRTtZQUMvQixLQUFLLEdBQUcsR0FBRyxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDckIsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2FBQzFCO1lBRUQsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQVcsRUFBRSxJQUFjLEVBQUUsT0FBa0M7SUFDaEcsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDNUMs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
;// CONCATENATED MODULE: ./node_modules/@conventional-changelog/git-client/dist/GitClient.js

const SCISSOR = '------------------------ >8 ------------------------';
/**
 * Wrapper around Git CLI.
 */
class GitClient {
    cwd;
    debug;
    constructor(cwd, debug = false) {
        this.cwd = cwd;
        this.debug = debug;
    }
    formatArgs(...args) {
        const finalArgs = formatArgs(...args);
        if (this.debug) {
            this.debug(finalArgs);
        }
        return finalArgs;
    }
    /**
     * Get raw commits stream.
     * @param params
     * @param params.path - Read commits from specific path.
     * @param params.from - Start commits range.
     * @param params.to - End commits range.
     * @param params.format - Commits format.
     * @yields Raw commits data.
     */
    async *getRawCommits(params = {}) {
        const { path, from = '', to = 'HEAD', format = '%B', ignore, ...restParams } = params;
        const shouldNotIgnore = ignore
            ? (chunk) => !ignore.test(chunk)
            : () => true;
        const args = this.formatArgs('log', `--format=${format}%n${SCISSOR}`, [from, to].filter(Boolean).join('..'), restParams, path && ['--', path]);
        const stdout = stdoutSpawn('git', args, {
            cwd: this.cwd
        });
        const commitsStream = splitStream(stdout, `${SCISSOR}\n`);
        let chunk;
        for await (chunk of commitsStream) {
            if (shouldNotIgnore(chunk)) {
                yield chunk;
            }
        }
    }
    /**
     * Get tags stream.
     * @param params - Additional git params.
     * @yields Tags
     */
    async *getTags(params = {}) {
        const tagRegex = /tag:\s*(.+?)[,)]/gi;
        const args = this.formatArgs('log', '--decorate', '--no-color', '--date-order', params);
        const stdout = stdoutSpawn('git', args, {
            cwd: this.cwd
        });
        let chunk;
        let matches;
        let tag;
        for await (chunk of stdout) {
            matches = chunk.toString().trim().matchAll(tagRegex);
            for ([, tag] of matches) {
                yield tag;
            }
        }
    }
    /**
     * Get last tag.
     * @param params - Additional git params.
     * @returns Last tag, `null` if not found.
     */
    async getLastTag(params = {}) {
        return (await this.getTags(params).next()).value || null;
    }
    /**
     * Check file is ignored via .gitignore.
     * @param file - Path to target file.
     * @param params - Additional git params.
     * @returns Boolean value.
     */
    async checkIgnore(file, params = {}) {
        const args = this.formatArgs('check-ignore', file, params);
        try {
            await spawn('git', args, {
                cwd: this.cwd
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }
    /**
     * Add files to git index.
     * @param files - Files to stage.
     * @param params - Additional git params.
     */
    async add(files, params = {}) {
        const args = this.formatArgs('add', files, params);
        await spawn('git', args, {
            cwd: this.cwd
        });
    }
    /**
     * Commit changes.
     * @param params
     * @param params.verify
     * @param params.sign
     * @param params.files
     * @param params.message
     */
    async commit(params) {
        const { verify = true, sign = false, files = [], message, ...restParams } = params;
        const args = this.formatArgs('commit', !verify && '--no-verify', sign && '-S', files, '-m', message, restParams);
        await spawn('git', args, {
            cwd: this.cwd
        });
    }
    /**
     * Create a tag for the current commit.
     * @param params
     * @param params.sign
     * @param params.name
     * @param params.message
     */
    async tag(params) {
        let { sign = false, name, message, ...restParams } = params;
        if (sign) {
            message = '';
        }
        const args = this.formatArgs('tag', sign && '-s', message && '-a', name, message && ['-m', message], restParams);
        await spawn('git', args, {
            cwd: this.cwd
        });
    }
    /**
     * Get current branch name.
     * @param params - Additional git params.
     * @returns Current branch name.
     */
    async getCurrentBranch(params = {}) {
        const args = this.formatArgs('rev-parse', '--abbrev-ref', 'HEAD', params);
        const branch = (await spawn('git', args, {
            cwd: this.cwd
        })).toString().trim();
        return branch;
    }
    /**
     * Push changes to remote.
     * @param branch
     * @param params - Additional git params.
     */
    async push(branch, params = {}) {
        const args = this.formatArgs('push', '--follow-tags', 'origin', branch, params);
        await spawn('git', args, {
            cwd: this.cwd
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2l0Q2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0dpdENsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsS0FBSyxFQUNMLFdBQVcsRUFDWCxXQUFXLEVBQ1gsVUFBVSxFQUNYLE1BQU0sWUFBWSxDQUFBO0FBU25CLE1BQU0sT0FBTyxHQUFHLHNEQUFzRCxDQUFBO0FBRXRFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFFVDtJQUNRO0lBRm5CLFlBQ1csR0FBVyxFQUNILFFBQTJDLEtBQUs7UUFEeEQsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNILFVBQUssR0FBTCxLQUFLLENBQTJDO0lBQ2hFLENBQUM7SUFFSSxVQUFVLENBQUMsR0FBRyxJQUFXO1FBQy9CLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBRXJDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7U0FDdEI7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNsQixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxLQUFLLENBQUEsQ0FBRSxhQUFhLENBQUMsU0FBZ0MsRUFBRTtRQUNyRCxNQUFNLEVBQ0osSUFBSSxFQUNKLElBQUksR0FBRyxFQUFFLEVBQ1QsRUFBRSxHQUFHLE1BQU0sRUFDWCxNQUFNLEdBQUcsSUFBSSxFQUNiLE1BQU0sRUFDTixHQUFHLFVBQVUsRUFDZCxHQUFHLE1BQU0sQ0FBQTtRQUNWLE1BQU0sZUFBZSxHQUFHLE1BQU07WUFDNUIsQ0FBQyxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUE7UUFDZCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUMxQixL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
// EXTERNAL MODULE: ./node_modules/semver/index.js
var semver = __webpack_require__(1383);
;// CONCATENATED MODULE: ./node_modules/@conventional-changelog/git-client/dist/ConventionalGitClient.js


/**
 * Helper to get package tag prefix.
 * @param packageName
 * @returns Tag prefix.
 */
function packagePrefix(packageName) {
    if (!packageName) {
        return /^.+@/;
    }
    return `${packageName}@`;
}
/**
 * Wrapper around Git CLI with conventional commits support.
 */
class ConventionalGitClient extends GitClient {
    deps = null;
    loadDeps() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        if (this.deps) {
            return this.deps;
        }
        this.deps = Promise.all([
            __webpack_require__.e(/* import() */ 703).then(__webpack_require__.bind(__webpack_require__, 7703))
                .then(({ parseCommits }) => parseCommits),
            __webpack_require__.e(/* import() */ 303).then(__webpack_require__.bind(__webpack_require__, 5303))
                .then(({ filterRevertedCommits }) => filterRevertedCommits)
        ]);
        return this.deps;
    }
    /**
     * Get parsed commits stream.
     * @param params
     * @param params.path - Read commits from specific path.
     * @param params.from - Start commits range.
     * @param params.to - End commits range.
     * @param params.format - Commits format.
     * @param parserOptions - Commit parser options.
     * @yields Raw commits data.
     */
    async *getCommits(params = {}, parserOptions = {}) {
        const { filterReverts, ...gitLogParams } = params;
        const [parseCommits, filterRevertedCommits] = await this.loadDeps();
        if (filterReverts) {
            yield* filterRevertedCommits(this.getCommits(gitLogParams, parserOptions));
            return;
        }
        const parse = parseCommits(parserOptions);
        const commitsStream = this.getRawCommits(gitLogParams);
        yield* parse(commitsStream);
    }
    /**
     * Get semver tags stream.
     * @param params
     * @param params.prefix - Get semver tags with specific prefix.
     * @param params.skipUnstable - Skip semver tags with unstable versions.
     * @param params.clean - Clean version from prefix and trash.
     * @yields Semver tags.
     */
    async *getSemverTags(params = {}) {
        const { prefix, skipUnstable, clean, ...restParams } = params;
        const tagsStream = this.getTags(restParams);
        const unstableTagRegex = /.+-\w+\.\d+$/;
        const cleanTag = clean
            ? (tag, unprefixed) => semver.clean(unprefixed || tag)
            : (tag) => tag;
        let unprefixed;
        let tag;
        for await (tag of tagsStream) {
            if (skipUnstable && unstableTagRegex.test(tag)) {
                continue;
            }
            if (prefix) {
                const isPrefixed = typeof prefix === 'string'
                    ? tag.startsWith(prefix)
                    : prefix.test(tag);
                if (isPrefixed) {
                    unprefixed = tag.replace(prefix, '');
                    if (semver.valid(unprefixed)) {
                        tag = cleanTag(tag, unprefixed);
                        if (tag) {
                            yield tag;
                        }
                    }
                }
            }
            else if (semver.valid(tag)) {
                tag = cleanTag(tag);
                if (tag) {
                    yield tag;
                }
            }
        }
    }
    /**
     * Get last semver tag.
     * @param params - getSemverTags params.
     * @returns Last semver tag, `null` if not found.
     */
    async getLastSemverTag(params = {}) {
        return (await this.getSemverTags(params).next()).value || null;
    }
    /**
     * Get current sematic version from git tags.
     * @param params - Additional git params.
     * @returns Current sematic version, `null` if not found.
     */
    async getVersionFromTags(params = {}) {
        const semverTagsStream = this.getSemverTags({
            clean: true,
            ...params
        });
        const semverTags = [];
        for await (const tag of semverTagsStream) {
            semverTags.push(tag);
        }
        if (!semverTags.length) {
            return null;
        }
        return semverTags.sort(semver.rcompare)[0] || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udmVudGlvbmFsR2l0Q2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0NvbnZlbnRpb25hbEdpdENsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFNM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRTFDOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLFdBQW9CO0lBQ2hELElBQUksQ0FBQyxXQUFXLEVBQUU7UUFDaEIsT0FBTyxNQUFNLENBQUE7S0FDZDtJQUVELE9BQU8sR0FBRyxXQUFXLEdBQUcsQ0FBQTtBQUMxQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsU0FBUztJQUMxQyxJQUFJLEdBQXdFLElBQUksQ0FBQTtJQUVoRixRQUFRO1FBQ2Qsa0VBQWtFO1FBQ2xFLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtTQUNqQjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUN0QixNQUFNLENBQUMsNkJBQTZCLENBQUM7aUJBQ2xDLElBQUksQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQztZQUMzQyxNQUFNLENBQUMsNkJBQTZCLENBQUM7aUJBQ2xDLElBQUksQ0FBQyxDQUFDLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUM7U0FDOUQsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2xCLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxLQUFLLENBQUEsQ0FBRSxVQUFVLENBQ2YsU0FBb0MsRUFBRSxFQUN0QyxnQkFBcUMsRUFBRTtRQUV2QyxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsWUFB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
;// CONCATENATED MODULE: ./node_modules/@conventional-changelog/git-client/dist/index.js



//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsY0FBYyxZQUFZLENBQUE7QUFDMUIsY0FBYyxnQkFBZ0IsQ0FBQTtBQUM5QixjQUFjLDRCQUE0QixDQUFBIn0=
// EXTERNAL MODULE: external "path"
var external_path_ = __webpack_require__(1017);
;// CONCATENATED MODULE: ./node_modules/conventional-changelog-preset-loader/dist/presetLoader.js

/**
 * Trying to add 'conventional-changelog-' prefix to preset name if it is a shorthand.
 * @param preset - Absolute path, package name or shorthand preset name.
 * @returns Variants of preset names.
 */
function resolvePresetNameVariants(preset) {
    if (external_path_.isAbsolute(preset)) {
        return [preset];
    }
    let scope = '';
    let name = preset.toLocaleLowerCase();
    if (preset.startsWith('@')) {
        const parts = preset.split('/');
        scope = `${parts.shift()}/`;
        if (scope === '@conventional-changelog/') {
            return [preset];
        }
        name = parts.join('/');
    }
    if (!name.startsWith('conventional-changelog-')) {
        name = `conventional-changelog-${name}`;
    }
    const altPreset = `${scope}${name}`;
    if (altPreset !== preset) {
        return [altPreset, preset];
    }
    return [preset];
}
/**
 * Gets default export from CommonJS or ES module.
 * @param module
 * @returns Default export.
 */
function getModuleDefaultExport(module) {
    if (('__esModule' in module || Object.getPrototypeOf(module) === null) && 'default' in module) {
        return module.default;
    }
    return module;
}
/**
 * Loads module with fallbacks.
 * @param moduleLoader - Function that loads module.
 * @param variants - Variants of module name to try.
 * @returns Loaded module.
 */
async function loadWithFallbacks(moduleLoader, variants) {
    let error = null;
    for (const variant of variants) {
        try {
            return getModuleDefaultExport(await moduleLoader(variant));
        }
        catch (err) {
            if (!error) {
                error = err;
            }
        }
    }
    throw error;
}
/**
 * Creates preset loader.
 * @param moduleLoader - Function that loads module.
 * @returns Function that loads preset.
 */
function createPresetLoader(moduleLoader) {
    return async function loadPreset(presetOrParams) {
        let preset = '';
        let params = null;
        if (typeof presetOrParams === 'string') {
            preset = presetOrParams;
        }
        else if (typeof presetOrParams === 'object' && typeof presetOrParams.name === 'string') {
            preset = presetOrParams.name;
            params = presetOrParams;
        }
        else {
            throw Error('Preset must be string or object with property `name`');
        }
        const presetNameVariants = resolvePresetNameVariants(preset);
        let createPreset = null;
        try {
            createPreset = await loadWithFallbacks(moduleLoader, presetNameVariants);
        }
        catch (err) {
            throw new Error(`Unable to load the "${preset}" preset. Please make sure it's installed.`, {
                cause: err
            });
        }
        if (typeof createPreset !== 'function') {
            throw new Error(`The "${preset}" preset does not export a function. Maybe you are using an old version of the preset. Please upgrade.`);
        }
        return params
            ? await createPreset(params)
            : await createPreset();
    };
}
/**
 * Load and create preset.
 */
const loadPreset = createPresetLoader(preset => __webpack_require__(4098)(preset));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2V0TG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3ByZXNldExvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLElBQUksTUFBTSxNQUFNLENBQUE7QUFXdkI7Ozs7R0FJRztBQUNILFNBQVMseUJBQXlCLENBQUMsTUFBYztJQUMvQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDM0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFBO0lBQ2QsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFFckMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFL0IsS0FBSyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUE7UUFFM0IsSUFBSSxLQUFLLEtBQUssMEJBQTBCLEVBQUU7WUFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1NBQ2hCO1FBRUQsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7S0FDdkI7SUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFO1FBQy9DLElBQUksR0FBRywwQkFBMEIsSUFBSSxFQUFFLENBQUE7S0FDeEM7SUFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQTtJQUVuQyxJQUFJLFNBQVMsS0FBSyxNQUFNLEVBQUU7UUFDeEIsT0FBTyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtLQUMzQjtJQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNqQixDQUFDO0FBRUQ7Ozs7R0FJ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
;// CONCATENATED MODULE: ./node_modules/conventional-changelog-preset-loader/dist/index.js


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsY0FBYyxZQUFZLENBQUE7QUFDMUIsY0FBYyxtQkFBbUIsQ0FBQSJ9
;// CONCATENATED MODULE: ./node_modules/conventional-recommended-bump/dist/utils.js
/**
 * Test if a value is an iterable
 * @param value
 * @returns `true` if value is an iterable, `false` otherwise
 */
function isIterable(value) {
    return value !== null && (typeof value[Symbol.iterator] === 'function'
        || typeof value[Symbol.asyncIterator] === 'function');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUksS0FBYztJQUMxQyxPQUFPLEtBQUssS0FBSyxJQUFJLElBQUksQ0FDdkIsT0FBUSxLQUFxQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxVQUFVO1dBQzFELE9BQVEsS0FBMEIsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssVUFBVSxDQUMzRSxDQUFBO0FBQ0gsQ0FBQyJ9
;// CONCATENATED MODULE: ./node_modules/conventional-recommended-bump/dist/bumper.js




const VERSIONS = [
    'major',
    'minor',
    'patch'
];
/**
 * Bump suggester for conventional commits
 */
class Bumper {
    gitClient;
    preset;
    whatBump;
    tagGetter;
    commitsGetter;
    constructor(cwdOrGitClient = process.cwd()) {
        this.gitClient = typeof cwdOrGitClient === 'string'
            ? new ConventionalGitClient(cwdOrGitClient)
            : cwdOrGitClient;
        this.preset = null;
        this.whatBump = null;
        this.tagGetter = () => this.getLastSemverTag();
        this.commitsGetter = () => this.getCommits();
    }
    getLastSemverTag(params) {
        return this.gitClient.getLastSemverTag(params);
    }
    async *getCommits(params, parserOptions) {
        yield* this.gitClient.getCommits({
            format: '%B%n-hash-%n%H',
            from: await this.tagGetter() || '',
            filterReverts: true,
            ...params
        }, parserOptions);
    }
    async getPreset() {
        const result = await this.preset;
        if (!result) {
            throw Error('Preset is not loaded or have incorrect exports');
        }
        return result;
    }
    /**
     * Load configs from a preset
     * @param preset
     * @returns this
     */
    loadPreset(preset) {
        this.preset = loadPreset(preset);
        this.whatBump = async (commits) => {
            const { whatBump } = await this.getPreset();
            return whatBump(commits);
        };
        this.tagGetter = async () => {
            const { tags } = await this.getPreset();
            return this.getLastSemverTag(tags);
        };
        this.commitsGetter = async function* commitsGetter() {
            const { commits, parser } = await this.getPreset();
            yield* this.getCommits(commits, parser);
        };
        return this;
    }
    /**
     * Set params to get the last semver tag
     * @param paramsOrTag - Params to get the last semver tag or a tag name
     * @returns this
     */
    tag(paramsOrTag) {
        if (typeof paramsOrTag === 'string') {
            this.tagGetter = () => paramsOrTag;
        }
        else {
            this.tagGetter = () => this.getLastSemverTag(paramsOrTag);
        }
        return this;
    }
    commits(paramsOrCommits, parserOptions) {
        if (isIterable(paramsOrCommits)) {
            this.commitsGetter = () => paramsOrCommits;
        }
        else {
            this.commitsGetter = () => this.getCommits(paramsOrCommits, parserOptions);
        }
        return this;
    }
    /**
     * Recommend a bump by `whatBump` function
     * @param whatBump - Function to recommend a bump from commits
     * @returns Bump recommendation
     */
    async bump(whatBump = this.whatBump) {
        if (typeof whatBump !== 'function') {
            throw Error('`whatBump` must be a function');
        }
        const commitsStream = this.commitsGetter();
        const commits = [];
        let commit;
        for await (commit of commitsStream) {
            commits.push(commit);
        }
        let result = await whatBump(commits);
        if (result && typeof result.level === 'number') {
            result.releaseType = VERSIONS[result.level];
        }
        else if (!result) {
            result = {};
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVtcGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2J1bXBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFhQSxPQUFPLEVBQ0wscUJBQXFCLEVBQ3JCLGFBQWEsRUFDZCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXZDLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQTtBQUV4QixNQUFNLFFBQVEsR0FBRztJQUNmLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztDQUNDLENBQUE7QUFFVjs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFNO0lBQ0EsU0FBUyxDQUF1QjtJQUN6QyxNQUFNLENBQXdCO0lBQzlCLFFBQVEsQ0FBMkI7SUFDbkMsU0FBUyxDQUF1QztJQUNoRCxhQUFhLENBQWdEO0lBRXJFLFlBQVksaUJBQWlELE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDeEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLGNBQWMsS0FBSyxRQUFRO1lBQ2pELENBQUMsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztZQUMzQyxDQUFDLENBQUMsY0FBYyxDQUFBO1FBRWxCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDOUMsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE1BQXFDO1FBQzVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJ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
;// CONCATENATED MODULE: ./node_modules/conventional-recommended-bump/dist/index.js

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsY0FBYyxhQUFhLENBQUEifQ==

/***/ })

};
