export const id = 303;
export const ids = [303];
export const modules = {

/***/ 5303:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "RevertedCommitsFilter": () => (/* reexport */ RevertedCommitsFilter),
  "filterRevertedCommits": () => (/* reexport */ filterRevertedCommits),
  "filterRevertedCommitsStream": () => (/* reexport */ filterRevertedCommitsStream),
  "filterRevertedCommitsSync": () => (/* reexport */ filterRevertedCommitsSync)
});

;// CONCATENATED MODULE: ./node_modules/conventional-commits-filter/dist/utils.js
/**
 * Match commit with revert data
 * @param object - Commit object
 * @param source - Revert data
 * @returns `true` if commit matches revert data, otherwise `false`
 */
function isMatch(object, source) {
    let aValue;
    let bValue;
    for (const key in source) {
        aValue = object[key];
        bValue = source[key];
        if (typeof aValue === 'string') {
            aValue = aValue.trim();
        }
        if (typeof bValue === 'string') {
            bValue = bValue.trim();
        }
        if (aValue !== bValue) {
            return false;
        }
    }
    return true;
}
/**
 * Find revert commit in set
 * @param commit
 * @param reverts
 * @returns Revert commit if found, otherwise `null`
 */
function findRevertCommit(commit, reverts) {
    if (!reverts.size) {
        return null;
    }
    const rawCommit = commit.raw || commit;
    for (const revertCommit of reverts) {
        if (revertCommit.revert && isMatch(rawCommit, revertCommit.revert)) {
            return revertCommit;
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0E7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUNyQixNQUFpQixFQUNqQixNQUFpQjtJQUVqQixJQUFJLE1BQWUsQ0FBQTtJQUNuQixJQUFJLE1BQWUsQ0FBQTtJQUVuQixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtRQUN4QixNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFcEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7WUFDOUIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtTQUN2QjtRQUVELElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxFQUFFO1lBQzlCLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7U0FDdkI7UUFFRCxJQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUU7WUFDckIsT0FBTyxLQUFLLENBQUE7U0FDYjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDYixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQW1CLE1BQVMsRUFBRSxPQUFlO0lBQzNFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO1FBQ2pCLE9BQU8sSUFBSSxDQUFBO0tBQ1o7SUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQTtJQUV0QyxLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sRUFBRTtRQUNsQyxJQUFJLFlBQVksQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDbEUsT0FBTyxZQUFZLENBQUE7U0FDcEI7S0FDRjtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ2IsQ0FBQyJ9
;// CONCATENATED MODULE: ./node_modules/conventional-commits-filter/dist/RevertedCommitsFilter.js

class RevertedCommitsFilter {
    hold = new Set();
    holdRevertsCount = 0;
    /**
     * Process commit to filter reverted commits
     * @param commit
     * @yields Commit
     */
    *process(commit) {
        const { hold } = this;
        const revertCommit = findRevertCommit(commit, hold);
        if (revertCommit) {
            hold.delete(revertCommit);
            this.holdRevertsCount--;
            return;
        }
        if (commit.revert) {
            hold.add(commit);
            this.holdRevertsCount++;
            return;
        }
        if (this.holdRevertsCount > 0) {
            hold.add(commit);
        }
        else {
            if (hold.size) {
                yield* hold;
                hold.clear();
            }
            yield commit;
        }
    }
    /**
     * Flush all held commits
     * @yields Held commits
     */
    *flush() {
        const { hold } = this;
        if (hold.size) {
            yield* hold;
            hold.clear();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmV2ZXJ0ZWRDb21taXRzRmlsdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1JldmVydGVkQ29tbWl0c0ZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFN0MsTUFBTSxPQUFPLHFCQUFxQjtJQUNmLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBSyxDQUFBO0lBQzVCLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUU3Qjs7OztPQUlHO0lBQ0gsQ0FBRSxPQUFPLENBQUMsTUFBUztRQUNqQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVuRCxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3ZCLE9BQU07U0FDUDtRQUVELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3ZCLE9BQU07U0FDUDtRQUVELElBQUksSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsRUFBRTtZQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1NBQ2pCO2FBQU07WUFDTCxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ2IsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUNYLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTthQUNiO1lBRUQsTUFBTSxNQUFNLENBQUE7U0FDYjtJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxDQUFFLEtBQUs7UUFDTCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBRXJCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNiLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNYLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtTQUNiO0lBQ0gsQ0FBQztDQUNGIn0=
// EXTERNAL MODULE: external "stream"
var external_stream_ = __webpack_require__(2781);
;// CONCATENATED MODULE: ./node_modules/conventional-commits-filter/dist/filters.js


/**
 * Filter reverted commits.
 * @param commits
 * @yields Commits without reverted commits.
 */
async function* filterRevertedCommits(commits) {
    const filter = new RevertedCommitsFilter();
    for await (const commit of commits) {
        yield* filter.process(commit);
    }
    yield* filter.flush();
}
/**
 * Filter reverted commits synchronously.
 * @param commits
 * @yields Commits without reverted commits.
 */
function* filterRevertedCommitsSync(commits) {
    const filter = new RevertedCommitsFilter();
    for (const commit of commits) {
        yield* filter.process(commit);
    }
    yield* filter.flush();
}
/**
 * Filter reverted commits stream.
 * @returns Reverted commits filter stream.
 */
function filterRevertedCommitsStream() {
    return external_stream_.Transform.from(filterRevertedCommits);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9maWx0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFFbEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbEU7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLHFCQUFxQixDQUcxQyxPQUF1QztJQUV2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixFQUFLLENBQUE7SUFFN0MsSUFBSSxLQUFLLEVBQUUsTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1FBQ2xDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7S0FDOUI7SUFFRCxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDdkIsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFNBQVMsQ0FBQyxDQUFDLHlCQUF5QixDQUd4QyxPQUFvQjtJQUVwQixNQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixFQUFLLENBQUE7SUFFN0MsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7UUFDNUIsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtLQUM5QjtJQUVELEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtBQUN2QixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQjtJQUN6QyxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUM5QyxDQUFDIn0=
;// CONCATENATED MODULE: ./node_modules/conventional-commits-filter/dist/index.js


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsY0FBYyw0QkFBNEIsQ0FBQTtBQUMxQyxjQUFjLGNBQWMsQ0FBQSJ9

/***/ })

};
